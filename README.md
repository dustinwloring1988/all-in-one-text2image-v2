# ImageAI: Transform Your Words into Stunning Visuals

ImageAI is a Next.js-based web application that harnesses the power of AI to create unique, high-quality images from text descriptions. This project showcases advanced image generation capabilities with a user-friendly interface.

## Features

- Text-to-image generation using AI
- User authentication and account management
- Credit system for image generation
- Advanced image customization options
- Responsive design for various devices
- Stripe integration for purchasing credits

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dustinwloring1988/all-in-one-text2image-v2.git
   cd all-in-one-text2image-v2
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add necessary environment variables (e.g., API keys, database URLs). Here are the required variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
   REPLICATE_API_TOKEN=<your_replicate_api_token>
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your_stripe_publishable_key>
   STRIPE_SECRET_KEY=<your_stripe_secret_key>
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `app/`: Contains the main application code
  - `components/`: Reusable React components
  - `pages/`: Next.js pages and API routes
  - `styles/`: Global styles and CSS modules
- `public/`: Static assets

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework for production
- [React](https://reactjs.org/) - JavaScript library for building user interfaces
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Shadcn UI](https://ui.shadcn.com/) - UI component library

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Dustin Loring - [@yourtwitter](https://twitter.com/dustinwlroing1988) - dustinwloring1988@gmail.com

Project Link: [https://github.com/dustinwloring1988/all-in-one-text2image](https://github.com/dustinwloring1988/all-in-one-text2image)
