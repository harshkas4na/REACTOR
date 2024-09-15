// create a basic express app
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import generateRouter from './routes/generate';

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());



app.use('/', generateRouter);


app.listen(5000, () => {
  console.log('Server listening on port 5000');
});
