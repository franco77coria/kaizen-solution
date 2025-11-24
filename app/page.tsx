import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import Hero from "@/components/sections/hero";
import StrategicPillars from "@/components/sections/strategic-pillars";
import CustomSolutions from "@/components/sections/custom-solutions";
import AISection from "@/components/sections/ai-section";
import Benefits from "@/components/sections/benefits";
import ContactCTA from "@/components/sections/contact-cta";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

export default async function Home() {
    let siteConfig = null;
    let services: any[] = [];
    let projects: any[] = [];

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
    } catch (error) {
        console.error('Error fetching data:', error);
        // Continue with empty data if database is not available
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
