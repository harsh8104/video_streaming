import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: 'db99r7ugz',
  api_key: 'process.env.CLOUDINARY_API_KEY',
  api_secret: 'process.env.CLOUDINARY_API_SECRET'
});

const uploadOnCloudinary=async (localFilePath)=>
    {
        try {
            if(!localFilePath) return null

            const response=await cloudinary.uploader.upload(localFilePath,{
                resource_type:"auto"
            })
            // console.log("File is uploaded on cloudinary",response.url);
            fs.unlinkSync(localFilePath)
            return response
            
        } catch (error) {
            console.log(error);
            fs.unlinkSync(localFilePath)
            return null
        }
    }

    export {uploadOnCloudinary}