[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/5TpXTvuY)  
  
# Massage Booking API

Express and MongoDB API for managing users, massages, reservations, and reviews.

## Setup

Install dependencies, rename `.env.example` to `.env` and fill out mongo connection string, then run:  

```bash
npm run dev
```

## Demo Data

The project includes a modular demo seeder that creates users, massages, reservations, and reviews. All generated users use the default password `password`.

Run the default seed:

```bash
npm run seed-demo
```

Supported flags for `node scripts/seedDemoData.js`:

```bash
--users=20 --admins=1 --massages=30 --reservations=50 --reviews=35 --clear=true
```

## API Docs

Open the Swagger UI at `/api-docs` when the server is running.

Machine-readable OpenAPI JSON is available at `/api-docs.json`.