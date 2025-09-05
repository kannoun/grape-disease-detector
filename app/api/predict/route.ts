import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image" }, { status: 400 })
    }

    // Save the uploaded file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempPath = join(process.cwd(), `temp_image_${Date.now()}.jpg`) // Unique temp file name
    await writeFile(tempPath, buffer)

    // Run the Python prediction script
    const result = await runPythonScript(tempPath)

    // Clean up the temporary file
    await unlink(tempPath).catch((err) => console.warn("Failed to delete temp file:", err))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Prediction error:", error)
    return NextResponse.json({ error: `Failed to process image: ${error.message}` }, { status: 500 })
  }
}

function runPythonScript(imagePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Path to the Python executable in your virtual environment
    const venvPythonPath = "/home/kan/grapedisease/grapeenv/bin/python"; // Replace with your venv path
    const scriptPath = join(process.cwd(), "scripts", "predict.py");

    console.log("Spawning Python process with:", venvPythonPath, scriptPath, imagePath);

    const pythonProcess = spawn(venvPythonPath, [scriptPath, imagePath], {
      env: { ...process.env, PYTHONPATH: join(process.cwd(), "scripts") }
    });

    let output = ""
    let errorOutput = ""

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
      console.log("Python stdout:", data.toString());
    })

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("Python stderr:", data.toString());
    })

    pythonProcess.on("close", (code) => {
      console.log(`Python process exited with code ${code}`);
      console.log("Full stdout:", output);
      console.log("Full stderr:", errorOutput);
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim())
          resolve(result)
        } catch (parseError) {
          reject(new Error(`Failed to parse Python script output: ${parseError.message}, Output: ${output}`))
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput || "No error output provided"}`))
      }
    })

    pythonProcess.on("error", (error) => {
      console.error("Spawn error:", error);
      reject(new Error(`Failed to spawn Python process: ${error.message}`))
    })
  })
}