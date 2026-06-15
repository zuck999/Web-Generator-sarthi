
import dotenv from "dotenv";

// import {cors} from 'cors';
dotenv.config();

const app = 
const port = 8080;
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true,
}));



app.get("/getTodo",getTodo);
app.post("/makeTodo",makeTodo);
app.delete("/delete/:id",deleteTodo);


app.listen(port, () => {
  console.log(`Listening on port ${port}`)
  connectDB();
});