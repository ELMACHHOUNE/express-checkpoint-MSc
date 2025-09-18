const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config({ path: path.join(__dirname, "../config/.env") });

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");

    const dataPath = path.join(__dirname, "../data/users.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    const users = JSON.parse(raw);

    // Build bulk upsert operations: insert if not exists (by email), do nothing otherwise
    const ops = users.map((u) => ({
      updateOne: {
        filter: { email: u.email },
        update: { $setOnInsert: { name: u.name, email: u.email, age: u.age } },
        upsert: true,
      },
    }));

    const result = await User.bulkWrite(ops, { ordered: false });

    const upserted =
      result.upsertedCount ?? (result.result && result.result.nUpserted) ?? 0;

    console.log(
      `Inserted ${upserted} new users, skipped ${
        users.length - upserted
      } existing`
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
