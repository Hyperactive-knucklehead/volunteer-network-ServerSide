const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => res.send("Volunteer Network Server is running"));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bm2i5.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("volunteer_network");
    const eventCollection = database.collection("events");
    const registeredCollection = database.collection("registered");

    //post an event , get events , get particular event by id, delete particular event by id ,update particular event by id
    app
      .post("/events", async (req, res) => {
        const event = req.body;
        const result = await eventCollection.insertOne(event);
        res.send(result);
      })
      .get("/events", async (req, res) => {
        const result = await eventCollection.find({}).toArray();
        res.send(result);
      })
      .get("/events/:id", async (req, res) => {
        const result = await eventCollection.findOne({
          _id: ObjectId(req.params.id),
        });
        res.send(result);
      })
      .delete("/events/:id", async (req, res) => {
        const result = await eventCollection.deleteOne({
          _id: ObjectId(req.params.id),
        });
        res.send(result);
      })
      .patch("/events/:id", async (req, res) => {
        const exist = await eventCollection.findOne({
          _id: ObjectId(req.params.id),
        });

        if (exist) {
          const result = await eventCollection.updateOne(
            { _id: ObjectId(req.params.id) },
            { $set: req.body }
          );
          res.send(result);
        } else res.status(404).send("Event not found!");
      });

    //post registration info , get all registration info, get particular registration info by emailId, delete particular registration by id
    app
      .post("/registeredInfo", async (req, res) => {
        const registeredInfo = req.body;
        const result = await registeredCollection.insertOne(registeredInfo);
        res.send(result);
      })
      .get("/registeredInfo", async (req, res) => {
        const result = await registeredCollection.find({}).toArray();
        res.send(result);
      })
      .get("/registeredInfo/:emailId", async (req, res) => {
        const result = await registeredCollection.findOne({
          email: req.params.emailId,
        });
        res.send(result);
      })
      .delete("/registeredInfo/:id", async (req, res) => {
        const result = await registeredCollection.deleteOne({
          _id: ObjectId(req.params.id),
        });
        res.send(result);
      });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => console.log(`listening to the port on ${port}`));
