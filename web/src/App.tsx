import { Header } from "./components/Header";
import { Hero } from "./components/landing/Hero";
import { ToolTabs } from "./components/tools/ToolTabs";
import { HowItWorks } from "./components/landing/HowItWorks";
import { Flywheel } from "./components/landing/Flywheel";
import { BringYourAgent } from "./components/landing/BringYourAgent";
import { Footer } from "./components/landing/Footer";

export default function App() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <Hero />
        <ToolTabs />
        <BringYourAgent />
        <HowItWorks />
        <Flywheel />
        <Footer />
      </main>
    </>
  );
}
