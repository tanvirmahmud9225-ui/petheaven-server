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

        app.get('/allpets', async (req, res) => {
            const result = await petsCollections.find().toArray();
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


















