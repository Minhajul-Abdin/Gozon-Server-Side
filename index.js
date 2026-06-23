const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = 5000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const uri = process.env.MONGO_DB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("gozon_db");
    const propertiesCollection = database.collection("properties");
    const userCollection = database.collection("user");
    const bookingCollection = database.collection("bookings");
    const reviewCollection = database.collection("reviews");

    //api to insert new property data
    app.post("/api/properties", async (req, res) => {
      const property = req.body;
      const newProperties = {
        ...property,
        createdAt: new Date(),
      };
      const result = await propertiesCollection.insertOne(newProperties);
      res.send(result);
    });

    // api to get properties

    app.get("/api/properties/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await propertiesCollection.findOne(query);
      console.log("Result", result);
      res.send(result);
    });

    app.get("/api/properties", async (req, res) => {
      const query = {};
      if (req.query.ownerId) {
        query.ownerId = req.query.ownerId;
      }
      const cursor = propertiesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/api/featured/properties", async (req, res) => {
      const query = {};
      if (req.query.ownerId) {
        query.ownerId = req.query.ownerId;
      }
      const cursor = propertiesCollection.find(query).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    //Booking related apis
    app.get("/api/bookings", async (req, res) => {
      const query = {};
      if (req.query.userId) {
        query.userId = req.query.userId;
      }
      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/api/bookings", async (req, res) => {
      const booking = req.body;
      const newBooking = {
        ...booking,
        createdAt: new Date(),
      };
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    //payment api

    app.post("/api/payment", async (req, res) => {
      const {
        sessionId,
        userId,
        priceId,
        name,
        price,
        propertyId,
        title,
        userEmail,
        status,
      } = req.body;

      const isExist = await bookingCollection.findOne({ sessionId });
      if (isExist) {
        return res.json({ msg: "Already exist!" });
      }

      await bookingCollection.insertOne({
        sessionId,
        userId,
        priceId,
        name,
        price,
        propertyId,
        title,
        userEmail,
        status,
        createdAt: new Date(),
      });

      res.json({ msg: "Payment successfull!" });
    });

    //review apis
    app.post("/api/review", async (req, res) => {
      const review = req.body;
      const newReview = {
        ...review,
        createdAt: new Date(),
      };
      const result = await reviewCollection.insertOne(newReview);
      res.send(result);
    });

    app.get("/api/review", async (req, res) => {
      const query = {};
      if (req.query.propertyId) {
        query.propertyId = req.query.propertyId;
      }
      const cursor = reviewCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
