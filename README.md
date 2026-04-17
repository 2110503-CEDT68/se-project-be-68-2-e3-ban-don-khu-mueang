# Massage Booking API

Express and MongoDB API for managing users, massages, reservations, and reviews.

## Setup

Install dependencies, create a `.env` file with `MONGO_URI`, `JWT_SECRET`, and `JWT_EXPIRE`, then run:

```bash
npm run dev
```

## Demo Data

The project includes a modular demo seeder that creates users, massages, reservations, and reviews. All generated users use the default password `password`.

Run the default seed:

```bash
npm run seed-demo
```

Generate a larger dataset without clearing existing records:

```bash
npm run generate-data
```

Clear the collections first, then generate the dataset:

```bash
npm run generate-data-clear
```

Supported flags for `node scripts/seedDemoData.js`:

```bash
--users=20 --admins=1 --massages=30 --reservations=50 --reviews=35 --clear=true
```

## API Docs

Open the Swagger UI at `/api-docs` when the server is running.