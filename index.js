const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-node-cjs-runtime");
const port = process.env.PORT || 7000


app.use(cors())
app.use(express.json())


const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization
    if (!authHeader) { return res.status(401).json({ message: "unauthorized" }) }



    const token = authHeader.split(" ")[1]
    if (!token) { return res.status(401).json({ message: "unauthorized" }) }

    try {
        const { payload } = await jwtVerify(token, JWKS)
        req.user = payload;
        next()
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" })
    }

}


const uri = process.env.MONGODB_URI


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});





async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("petadopt");
        const petsCollections = database.collection("allpets")
        const petRequestCollections = database.collection("petsRequest")

        app.get('/allpets', async (req, res) => {
            const { search } = req.query;

            let cursor;
            if (search) {
                cursor = petsCollections.find({
                    $or: [
                        { petName: { $regex: search, $options: 'i' } },
                        { breed: { $regex: search, $options: 'i' } },
                        { vaccinationStatus: { $regex: search, $options: 'i' } },

                    ]
                })
            } else {
                cursor = petsCollections.find()
            }

            const result = await cursor.toArray();
            res.send(result)
        })


        app.post('/allpets', async (req, res) => {
            const cursor = req.body;
            const result = await petsCollections.insertOne(cursor);
            res.send(result)
        })


        app.get('/homepagepets', async (req, res) => {
            const result = await petsCollections.find().limit(6).toArray();
            res.send(result)
        })

        app.get('/allpets/:petId', verifyToken, async (req, res) => {
            const petId = req.params.petId
            const result = await petsCollections.findOne({ _id: new ObjectId(petId) })
            res.send(result)
        })


        app.delete('/allpets/:petId', async (req, res) => {
            const petId = req.params.petId
            const result = await petsCollections.deleteOne({ _id: new ObjectId(petId) })
            res.send(result)
        })

        app.post('/petrequest/:petId', async (req, res) => {

            const { petId } = req.params;
            const adoptData = req.body

            const adoptRequest = await petsCollections.findOne({ _id: new ObjectId(petId) })
            if (!adoptRequest) {
                res.status(404).json({ message: "pet not found" })
            }

            await petsCollections.updateOne(
                { _id: new ObjectId(petId) },
                { $set: { status: "pending", updatedAt: new Date() } }
            )


            const result = await petRequestCollections.insertOne({
                ...adoptData,
                adoptAt: new Date(),
            })
            res.send(result)

        })

        app.get('/petrequest/:userId', async (req, res) => {
            const { userId } = req.params;
            const result = await petRequestCollections.find({ uerId: userId }).toArray()
            res.send(result)

        })


        app.delete('/petrequest/:id', async (req, res) => {
            const { id } = req.params;
            const result = await petRequestCollections.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


















