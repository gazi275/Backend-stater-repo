import Stripe from "stripe"
import config from "../config"

const stripe = new Stripe(config.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
})

export { stripe }

