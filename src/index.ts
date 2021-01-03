import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import databaseHelper from './database.helper';
import requestIp from 'request-ip';
dotenv.config();


async function start(app: express.Application, defaultPort: number | undefined = undefined): Promise<void> {
    await databaseHelper.connect();
    console.log('Database connected');

    middleware(app);
    routes(app);
    const port = process.env.PORT ?? 3000;
    const server = app.listen(port);
    console.log(`Server listening on port ${port}`);
    process.on('SIGINT', () => {
        console.log('Killing the server');
        databaseHelper.closeConnection();
        console.log('Connection closed');
        server.close();
        process.exit();
    });
}

function middleware(app: express.Application) {
    app.use(bodyParser.json());
    if (!process.env.PROD)
        app.use((req, res, next) => morgan('dev')(req, res, next));
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', '*');
        next();
    });
}

function routes(app: express.Application) {
    app.get('/', (req, res) => { res.send("I'm ok :)") });
    app.get('/result', (req, res) => { getResults(req, res); });
    app.post('/save', (req, res) => { save(req, res); });
}

async function save(req: express.Request, res: express.Response) {
    for (const k in req.body) {
        if (typeof req.body[k] !== 'number') {
            return res.status(400).send('1');
        } else {
            if (req.body[k] > 5)
                req.body[k] = 5
            else if (req.body[k] < 1)
                req.body[k] = 1
        }
    }
    const inserted = (await databaseHelper.getCollection('presepi').insertOne({
        ...req.body,
        ip: requestIp.getClientIp(req),
        date: new Date()
    })).insertedCount
    if (inserted !== 1)
        return res.status(500).send('2');
    else
        return res.status(201).send('OK');
}

async function getResults(req: express.Request, res: express.Response) {
    const votesArrs: { [id: string]: number[] }  = (await databaseHelper
        .getCollection('presepi')
        .find()
        .toArray())
        .map(x => {
            delete x._id;
            delete x.ip;
            delete x.date;
            return x;
        })
        .reduce((a, b) => {
            for (const k in b) {
                if (a[k] === undefined) {
                    a[k] = [b[k]]
                } else {
                    a[k].push(b[k])
                }
            }
            return a;
        }, {})
    const votes: { [id: string]: { avg: number, n: number } } = {}
    for (const k in votesArrs) {
        votes[k] = {
            avg: votesArrs[k].length > 0 ? votesArrs[k].reduce((a, b) => a + b, 0) / votesArrs[k].length : 0,
            n: votesArrs[k].length
        }
    }
    return res.send(votes)
}


const app = express();
start(app);