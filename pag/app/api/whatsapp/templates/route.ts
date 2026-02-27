import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTemplatesFromMeta } from "@/lib/whatsapp"

export async function GET() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const templates = await getTemplatesFromMeta()
        // #region agent log
        const debugTemplates = templates.slice(0, 5).map((t: any) => ({ name: t.name, bodyText: t.bodyText, componentsTypes: t.components?.map((c: any) => ({ type: c.type, textPreview: c.text?.substring(0, 120) })) }));
        fetch('http://127.0.0.1:7243/ingest/f9affe2b-8796-441f-9dcd-82782f1c48ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'templates-route.ts:GET',message:'Templates from Meta API',data:{count:templates.length,samples:debugTemplates},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        return NextResponse.json({ success: true, templates })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
