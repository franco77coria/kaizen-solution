import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import Hero from "@/components/sections/hero";
import StrategicPillars from "@/components/sections/strategic-pillars";
import CustomSolutions from "@/components/sections/custom-solutions";
import AISection from "@/components/sections/ai-section";
import Benefits from "@/components/sections/benefits";
import ContactCTA from "@/components/sections/contact-cta";
import { prisma } from "@/lib/prisma";

export default async function Home() {
    const siteConfig = await prisma.siteConfig.findFirst();
    const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
    });
    const projects = await prisma.project.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
    });

    return (
        <main className="min-h-screen">
            <Navbar />
            <Hero
                title={siteConfig?.heroTitle}
                subtitle={siteConfig?.heroSubtitle}
                ctaText={siteConfig?.ctaText}
            />
            <StrategicPillars services={services} />
            <CustomSolutions projects={projects} />
            <AISection />
            <Benefits />
            <ContactCTA
                whatsappNumber={siteConfig?.whatsappNumber}
                whatsappMessage={siteConfig?.whatsappMessage}
            />
            <Footer
                companyName={siteConfig?.companyName}
                email={siteConfig?.email}
                phone={siteConfig?.phone || undefined}
                address={siteConfig?.address || undefined}
                linkedinUrl={siteConfig?.linkedinUrl}
                instagramUrl={siteConfig?.instagramUrl}
                facebookUrl={siteConfig?.facebookUrl}
                twitterUrl={siteConfig?.twitterUrl}
            />
        </main>
    );
}
