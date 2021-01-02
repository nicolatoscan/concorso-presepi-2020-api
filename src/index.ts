import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import databaseHelper from './database.helper';
dotenv.config();


async function start(app: express.Application, defaultPort: number | undefined = undefined): Promise<void> {
    await databaseHelper.connect();
    console.log('Database connected');

    middleware(app);
    routes(app);
    const port = 3000;
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
    app.post('/save', (req, res) => { save(req, res); });
}

async function save(req: express.Request, res: express.Response) {
    for (const k in req.body) {
        if (typeof req.body[k] !== 'number') {
            return res.status(400).send('1');
        }
    }
    const inserted = (await databaseHelper.getCollection('presepi').insertOne({
        ...req.body,
        date: new Date()
    })).insertedCount
    if (inserted !== 1)
        return res.status(500).send('2');
    else
        return res.status(201).send('OK');
}


const app = express();
start(app);