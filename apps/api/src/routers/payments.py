"""
Stripe payment integration for donations.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
import os
from typing import Optional

router = APIRouter(prefix="/payments", tags=["payments"])

# Stripe will be initialized when the key is available
stripe = None

def get_stripe():
    global stripe
    if stripe is None:
        import stripe as stripe_module
        stripe_module.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe_module.api_key:
            raise HTTPException(
                status_code=503,
                detail="Stripe not configured"
            )
        stripe = stripe_module
    return stripe


class DonationRequest(BaseModel):
    amount: int = Field(..., ge=100, description="Amount in cents (min 100 = 1€)")
    currency: str = Field(default="eur")
    email: Optional[str] = None
    message: Optional[str] = None
    success_url: str
    cancel_url: str


class DonationResponse(BaseModel):
    checkout_url: str
    session_id: str


@router.post("/create-donation", response_model=DonationResponse)
async def create_donation_session(donation: DonationRequest):
    """
    Create a Stripe Checkout session for a donation.
    Returns the URL to redirect the user to.
    """
    try:
        stripe = get_stripe()
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card", "sepa_debit", "paypal"],
            line_items=[{
                "price_data": {
                    "currency": donation.currency,
                    "product_data": {
                        "name": "Infinite Canvas Spende",
                        "description": donation.message or "Vielen Dank für deine Unterstützung!",
                        "images": ["https://your-domain.com/icons/icon-512.png"],
                    },
                    "unit_amount": donation.amount,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=donation.success_url,
            cancel_url=donation.cancel_url,
            customer_email=donation.email,
            metadata={
                "type": "donation",
                "message": donation.message or "",
            },
            submit_type="donate",
        )
        
        return DonationResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks for payment events.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    
    try:
        stripe = get_stripe()
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event.type == "checkout.session.completed":
        session = event.data.object
        
        # Log successful donation
        amount = session.amount_total / 100
        currency = session.currency.upper()
        print(f"[Donation] Received {amount} {currency}")
        
        # Could send thank-you email, update stats, etc.
        
    elif event.type == "payment_intent.succeeded":
        # Payment confirmed
        pass
        
    elif event.type == "payment_intent.payment_failed":
        # Payment failed
        pass
    
    return {"status": "ok"}


@router.get("/config")
async def get_stripe_config():
    """
    Get Stripe publishable key for frontend.
    """
    publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY")
    
    if not publishable_key:
        return {"configured": False}
    
    return {
        "configured": True,
        "publishable_key": publishable_key,
    }
