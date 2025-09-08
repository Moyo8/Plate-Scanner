const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());


mongoose.connect("mongodb://127.0.0.1:27017/platedb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const PlateSchema = new mongoose.Schema({
  plateNumber: String,
  ownerInfo: {
    name: String,
    phoneNo: String,
  },
  carInfo: {
    model: String,
    color: String,
    category: String,
    expires: Date,
  },
  status: String,
  registeredBy: String,
});

const Plate = mongoose.model("Plate", PlateSchema);

app.get("/api/plates", async (req, res) => {
  const plates = await Plate.find();
  res.json(plates);
});

app.post("/api/plates", async (req, res) => {
  const newPlate = new Plate(req.body);
  await newPlate.save();
  res.json(newPlate);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
