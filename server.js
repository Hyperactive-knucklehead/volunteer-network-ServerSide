const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const admin = require("firebase-admin");
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

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = async (req, res, next) => {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers?.authorization.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedEmail = decodedUser.email;
    } catch (error) {
      error && res.status(401).json({ message: "UnAuthorized" });
    }
  }
  next();
};

async function run() {
  try {
    await client.connect();
    const database = client.db("volunteer_network");
    const eventCollection = database.collection("events");
    const registeredCollection = database.collection("registered");
    const userCollection = database.collection("users");

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

    //post registration info , get all registration info, get particular registration info by emailId, delete particular registration by id, update status by id
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
      .get("/registeredInfo/:emailId", verifyToken, async (req, res) => {
        if (req.decodedEmail === req.params.emailId) {
          const result = await registeredCollection
            .find({
              email: req.params.emailId,
            })
            .toArray();
          res.send(result);
        } else
          res.status(403).send({
            message: "Sorry, it's not allowed to go beyond this point!",
          });
      })
      .delete("/registeredInfo/:id", async (req, res) => {
        const result = await registeredCollection.deleteOne({
          _id: ObjectId(req.params.id),
        });
        res.send(result);
      })
      .patch("/registeredInfo/:id", async (req, res) => {
        const exist = await registeredCollection.findOne({
          _id: ObjectId(req.params.id),
        });
        if (exist) {
          const result = await registeredCollection.updateOne(
            { _id: ObjectId(req.params.id) },
            { $set: req.body }
          );
          res.send(result);
        } else res.status(404).send("Registration not found");
      });

    //post user , get users ,get particular user by emailId, replace firebase google signIn or github signIn userInfo , role play updating for admin , get admin by emailId
    app
      .post("/users", async (req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
      })
      .get("/users", async (req, res) => {
        const result = await userCollection.find({}).toArray();
        res.send(result);
      })
      .get("/users/:emailId", async (req, res) => {
        const result = await userCollection.findOne({
          email: req.params.emailId,
        });
        res.send(result);
      })
      .put("/users", async (req, res) => {
        const result = await userCollection.updateOne(
          { email: req.body.email },
          { $set: req.body },
          { upsert: true }
        );
        res.send(result);
      })
      .put("/users/admin", verifyToken, async (req, res) => {
        const requester = req.decodedEmail;
        if (requester) {
          const requesterAccount = await userCollection.findOne({
            email: requester,
          });
          if (requesterAccount.role === "admin") {
            const result = await userCollection.updateOne(
              { email: req.body.email },
              { $set: { role: "admin" } },
              { upsert: true }
            );
            res.send(result);
          } else
            res.status(403).send({
              message: "Sorry, it's not allowed to go beyond this point!",
            });
        }
      })
      .get("/users/admin/:emailId", async (req, res) => {
        const result = await userCollection.findOne({
          email: req.params.emailId,
          role: "admin",
        });
        if (result) res.send({ admin: true });
        else res.send({ admin: false });
      });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => console.log(`listening to the port on ${port}`));
