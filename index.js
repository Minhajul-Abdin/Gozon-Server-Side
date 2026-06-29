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

const logger = (req, res, next) => {
  console.log("logger millware", req.params);
  next();
};

const uri = process.env.MONGO_DB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//async function run() {
// try {
// Connect the client to the server	(optional starting in v4.7)
//await client.connect();

client
  .connect(() => {
    console.log("connecting to MOngo db");
  })
  .catch(console.dir);

const database = client.db("gozon_db");
const SessionCollection = database.collection("session");
const propertiesCollection = database.collection("properties");
const userCollection = database.collection("user");
const bookingCollection = database.collection("bookings");
const reviewCollection = database.collection("reviews");
const favouriteCollection = database.collection("favourite");

//varification related stuff
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const query = { token: token };
  const session = await SessionCollection.findOne(query);
  const userId = session.userId;
  const userQuery = {
    _id: userId,
  };

  const user = await userCollection.findOne(userQuery);
  console.log(user);
  //set data
  req.user = user;
  next();
};

const verifyTenant = async (req, res, next) => {
  if (req.user?.role !== "tenant") {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

//must use after varifyToken middleware
const verifyAdmin = async (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

//must use after varifyToken middleware
const verifyOwner = async (req, res, next) => {
  if (req.user?.role !== "owner") {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

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

app.get("/api/allProperties", async (req, res) => {
  const cursor = propertiesCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/api/properties/:id", async (req, res) => {
  const id = req.params.id;
  const query = {
    _id: new ObjectId(id),
  };
  const result = await propertiesCollection.findOne(query);
  //console.log("Result", result);
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

app.patch("/api/properties/:id", async (req, res) => {
  const id = req.params.id;
  const updatedProperty = req.body;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      status: updatedProperty.status,
    },
  };
  const result = await propertiesCollection.updateOne(filter, updateDoc);
  res.send(result);
});
//Booking related apis
app.get("/api/bookings", async (req, res) => {
  const query = {};
  if (req.query.userId) {
    query.userId = req.query.userId;
    if (req.query._id.toString() !== req.query.userId) {
      return res.status(403).send({ message: "forbidden access" });
    }
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

app.get("/api/review/:id", async (req, res) => {
  const id = req.params.id;

  const query = {
    propertyId: id,
  };
  console.log(query);
  const cursor = reviewCollection.find(query);
  const result = await cursor.toArray();
  console.log(result);
  res.send(result);
});

app.get("/api/review", async (req, res) => {
  try {
    const result = await reviewCollection.find({}).limit(4).toArray();

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch reviews" });
  }
});

//favourite apis
app.post("/api/favourite", async (req, res) => {
  const favourite = req.body;

  const filter = {
    propertyId: favourite.propertyId,
    bookerId: favourite.bookerId,
  };

  const isExist = await favouriteCollection.findOne(filter);
  if (isExist) {
    return res.json({ msg: "Already exist!" });
  }

  const newFav = {
    ...favourite,
    createdAt: new Date(),
  };

  await favouriteCollection.insertOne(newFav);
  res.json({ msg: "favourite added successfully!" });
});

app.get("/api/favourite", async (req, res) => {
  const query = {};
  if (req.query.userId) {
    query.userId = req.query.userId;
    if (req.query._id.toString() !== req.query.userId) {
      return res.status(403).send({ message: "forbidden access" });
    }
  }
  const cursor = favouriteCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

app.delete("/api/favourite", async (req, res) => {
  const { propetryId } = req.body;
  console.log(req.body);
  const result = await favouriteCollection.deleteOne({
    _id: new ObjectId(propetryId),
  });
  res.json(result);
});

// Send a ping to confirm a successful connection
// await client.db("admin").command({ ping: 1 });
// console.log(
//  "Pinged your deployment. You successfully connected to MongoDB!",
// );
// } finally {
// Ensures that the client will close when you finish/error
//await client.close();
// }
//}
//run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;
