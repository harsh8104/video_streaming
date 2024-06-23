import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
        //Not Good choice because same name files will overwrite 
        //in case of same files upload by user on large scale
        //return original file name that means local file path will
        //return by this which used in cloudinary setup
      cb(null, file.originalname)
    } 
  })
  
  export const upload = multer({ storage: storage })