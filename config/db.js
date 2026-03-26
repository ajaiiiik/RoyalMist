const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1); 
  }
};


const createAdmin = async () => {
  try {
    const email = "admin@royalmist.com";
    const existingAdmin = await User.findOne({ email, role: "admin" });

    if (existingAdmin) {
      console.log("Admin already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    await User.create({
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin created successfully!");
  } catch (err) {
    console.error("Error creating admin:", err.message);
  } finally {
    mongoose.connection.close();
  }
};

module.exports = connectDB;


