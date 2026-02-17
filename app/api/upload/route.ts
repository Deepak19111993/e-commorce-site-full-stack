
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import fs from "fs";

export const POST = async (req: NextRequest) => {
    const formData = await req.formData();

    const file = formData.get("file");
    if (!file) {
        return NextResponse.json({ error: "No files received." }, { status: 400 });
    }

    const buffer = Buffer.from(await (file as Blob).arrayBuffer());
    const filename = Date.now() + "_" + (file as File).name.replaceAll(" ", "_");

    try {
        const uploadDir = path.join(process.cwd(), "public/uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        await writeFile(
            path.join(uploadDir, filename),
            buffer
        );
        return NextResponse.json({ url: "/uploads/" + filename, status: 201 });
    } catch (error) {
        console.log("Error occurred ", error);
        return NextResponse.json({ Message: "Failed", status: 500 });
    }
};
