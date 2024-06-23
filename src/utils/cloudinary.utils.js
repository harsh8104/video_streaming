import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: 'db99r7ugz',
  api_key: '273374929993245',
  api_secret: 'OVkXM3Y29uCjXuR6V1PAFs12Des'
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