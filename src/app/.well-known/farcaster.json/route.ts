export async function GET() {
  const appUrl = "https://quizelo.vercel.app"
  
  
  // The .well-known/farcaster.json route is used to provide the configuration for the Frame.
  // You need to generate the accountAssociation payload and signature using this link:

  
  const config = {
    "accountAssociation": {
      "header": "eyJmaWQiOjgxMDc4MiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEVhMzg3NzJCN2I2MjVGODY1M0MwMzQxNzk3QjE3MUUzMDI5RTEzMjUifQ",
      "payload": "eyJkb21haW4iOiJxdWl6ZWxvLnZlcmNlbC5hcHAifQ",
      "signature": "MHhlZjE0MDMwOWMzOWI5MDM3ZGRhMDk2NjE4MmZmZDI4MGU1MDA5ZTYzNThkNDMyMWQyNjllOWYwOGZkYzBiYjVlNTMwN2NjOGU1NjhlZmMzMzFiMjQzNjc3N2IwMGIxNjE3ZGY4YjNjOGU2YzY3MDhjN2I4MTAzYmI3ZGQ3OWRlNzFi"
    
    },
    frame: {
      version: "1",
      name: "Quizelo",
      iconUrl: `${appUrl}/logo.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/logo.png`,
      buttonTitle: "Play & Earn",
      splashImageUrl: `${appUrl}/logo.png`,
      splashBackgroundColor: "#f7f7f7",
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  return Response.json(config);
}