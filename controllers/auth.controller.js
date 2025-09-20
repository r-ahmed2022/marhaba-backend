import bcrypt from 'bcryptjs'
import userSchema from '../models/User.js';
import generateToken from '../lib/generateToken.js';
import cloudinary from '../lib/cloudinary.js';
export const signup = async (req, res) => {
    const {email, fullName, profilePicture , password } = req.body;
     console.log(req.body)
    if(!email || !fullName || !password){
    return  res.status(400).json("All Fields are required")
      }    
     if(password.length < 6){
    return  res.status(400).json("Password must be at least 6 characters long")
    }

    const User = req.db.model('User', userSchema);
    
   const existingUser = await User.findOne({email});
if (existingUser) {
  return res.status(409).json("Email already registered");
} else {
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    email,
    fullName,
    password: hashedPassword,
    profilePicture,
  });

  return res.status(201).json({ success: `User ${fullName} successfully registered` });
}

}
export async function login(req, res) {
 const {email, password} = req.body;
    if(!email || !password){
    return res.status(400).json("All fields are required")
    }
    const User = req.db.model('User', userSchema);

    const user = await User.findOne({email});
    if(!user) return res.status(404).json("User not found")
    const passwordMatch = await bcrypt.compare(password, user.password);
    if(!passwordMatch) return res.status(401).json("Invalid credentials")
    await  generateToken(user._id, res);
  
   return res.status(200).json({
  message: `${user.fullName} successfully logged in`,
  user: { id: user._id, fullName: user.fullName, email: user.email }
});
}   
export function logout(req, res) {
    res.clearCookie('token');   
    res.send('User logged out');
}   

export async function updateProfile(req, res) {
    const {profilePicture } = req.body;
    if(!profilePicture) {
        return res.status(400).json("Profile picture is required");
    } else {
    try {
        const profilePicUrl = await cloudinary.uploader.upload(profilePicture, {
        folder: 'profile_pictures',
        width: 300,
        height: 300,
        crop: 'fill'      
    });
         const User = req.db.model('User', userSchema);
        const updatedUser = await User.findByIdAndUpdate(req.user._id, {
            profilePicture: profilePicUrl.secure_url
        }, { new: true });
        if (!updatedUser) {
            return res.status(404).json("User not found");
        }
        res.status(200).json({ success: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        res.status(500).json("Server error");
    }
} 
 }


export function authenticated(req, res) {
    try {
         res.status(200).json(req.user);
    }catch (error) {
        console.log(error.message)
        res.status(500).json("Server error");
    } 
}   