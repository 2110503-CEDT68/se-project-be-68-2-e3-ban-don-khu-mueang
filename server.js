//if mongo connection error, change dns.setServers to use local dns
//const dns = require('node:dns');
//dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

//Security middleware
const expressMongoSanitize = require("@exortek/express-mongo-sanitize");
const helmet = require("helmet");
// const { xss } = require("express-xss-sanitizer");
const limiter = require("./middleware/rateLimiter");
const hpp = require("hpp");
const cors = require("cors");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

//Load env vars
dotenv.config({ path: ".env" });

//Connect to database
connectDB();

//Route files
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const reservations = require("./routes/reservations");
const massages = require('./routes/massages');
const users = require('./routes/users');

const app = express();

//Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//Body parser
app.use(express.json());

//Sanitize data
// app.use(expressMongoSanitize());

app.use(express.urlencoded({ extended: true }));

//Prevent XSS
// app.use(xss());

//Rate limiting
app.use(limiter);

//Prevent parameter pollution
// app.use(hpp());

//Enable CORS
app.use(cors());

//Security headers
app.use(helmet());

//Cookie parser
app.use(cookieParser());

//Mount routers
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservations);
app.use('/api/massages', massages);
app.use('/api/massages/:massageId/reservations', reservations);
app.use('/api/users', users);
// Global 404 and 500 error handlers
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `${req.originalUrl} does not exist`
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
