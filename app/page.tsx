import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import Hero from "@/components/sections/hero";
import StrategicPillars from "@/components/sections/strategic-pillars";
import CustomSolutions from "@/components/sections/custom-solutions";
import AISection from "@/components/sections/ai-section";
import Benefits from "@/components/sections/benefits";
import ContactCTA from "@/components/sections/contact-cta";
import { prisma } from "@/lib/prisma";
import { Service, Project } from "@prisma/client";

export default async function Home() {
    let siteConfig;
    let services: Service[] = [];
    let projects: Project[] = [];

    try {
        siteConfig = await prisma.siteConfig.findFirst();
        services = await prisma.service.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        projects = await prisma.project.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
    } catch (e) {
        console.warn("Database connection failed during render (likely build time or missing env vars). Rendering with empty data.", e);
    }

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
