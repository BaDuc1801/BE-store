import userModel from "../model/user.schema.js"
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv';
dotenv.config();

const getCloudinaryConfig = JSON.parse(process.env.CLOUD_DINARY_CONFIG);
cloudinary.config(getCloudinaryConfig);

const userController = {
    getUsers: async (req, res) => {
        const listUser = await userModel.find().populate('cart.itemID');
        res.status(200).send(listUser)
    },

    register: async (req, res) => {
        try {
            const { email, password, username } = req.body;
            const hashedPassword = bcrypt.hashSync(password, 10);
            const saveuser = await userModel.create({
                avatar: "https://res.cloudinary.com/dzpw9bihb/image/upload/v1726676632/wgbdsrflw8b1vdalkqht.jpg",
                username,
                email,
                password: hashedPassword,
                // role: "admin"
            })
            res.status(201).send(saveuser)
        } catch (error) {
            res.status(400).send({
                message: error.message
            })
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await userModel.findOne({ email });
            const compare = bcrypt.compareSync(password, user.password);
            if (!compare) {
                throw new Error('Email hoặc password không đúng');
            }
            const accessToken = jwt.sign({
                userId: user._id,
                role: user.role
            }, process.env.SECRETKEY, { expiresIn: "1h" });

            const refreshToken = jwt.sign({
                userId: user._id,
                role: user.role
            }, process.env.SECRETKEY, { expiresIn: "24h" });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'None',
            });

            res.status(200).send({
                message: "Đăng nhập thành công",
                accessToken: accessToken
            })
        } catch (error) {
            res.status(400).send(error.message)
        }
    },

    refreshAccessToken: async (req, res) => {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Không tìm thấy refresh token' });
        }
        try {
            const decoded = jwt.verify(refreshToken, process.env.SECRETKEY);
            const user = await userModel.findById(decoded.userId);
            if (!user) {
                return res.status(403).json({ message: 'Không tìm thấy người dùng' });
            }

            const newAccessToken = jwt.sign({
                userId: user._id,
                role: user.role
            }, process.env.SECRETKEY, { expiresIn: "1h" });

            res.status(200).send({ accessToken: newAccessToken });
        } catch (error) {
            res.status(403).send({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
        }
    },


    resetPass: async (req, res) => {
        try {
            const { email, password } = req.body;
            const hashedPassword = bcrypt.hashSync(password, 10);
            const saveuser = await userModel.findOneAndUpdate({ email: email }, {
                password: hashedPassword
            })
            res.status(201).send(saveuser)
        } catch (error) {
            res.status(400).send({
                message: error.message
            })
        }
    },

    forgotPass: async (req, res) => {
        try {
            const { email } = req.body;
            const existEmail = await userModel.findOne({ email })
            if (!existEmail) {
                throw new Error('Email does not exist!')
            }
            const newOTP = Math.floor(100000 + Math.random() * 900000);
            const newCachOtp = {
                [newOTP]: email,
            }
            res.status(200).send({
                message: "OTP sent successfully!",
                data: newCachOtp
            })
        } catch (error) {
            res.status(200).send({
                message: error.message
            })
        }
    },

    addToCart: async (req, res) => {
        const userID = req.user.userId;
        const { itemID, quantity } = req.body;
        try {
            const user = await userModel.findOneAndUpdate(
                {
                    _id: userID,
                    'cart.itemID': itemID
                },
                {
                    $inc: { 'cart.$.quantity': quantity }
                },
                {
                    new: true
                }
            );
            if (!user) {
                await userModel.findByIdAndUpdate(userID, {
                    $push: {
                        cart: {
                            itemID,
                            quantity
                        }
                    }
                });
            }
            const rs = await userModel.findById(userID).populate('cart.itemID');
            return res.status(200).send(rs.cart);

        } catch (error) {
            console.error('Error in addToCart:', error);
            res.status(400).send({
                message: error.message,
            });
        }
    },

    updateCart: async (req, res) => {
        const userID = req.user.userId;
        const cart = req.body;
        try {
            const user = await userModel.findByIdAndUpdate(
                userID,
                { cart: cart },
                { new: true }
            ).populate('cart.itemID');

            if (!user) {
                return res.status(404).send({
                    message: 'User not found'
                });
            }

            res.status(200).send(user.cart);
        } catch (error) {
            console.error('Error in updateCart:', error);
            res.status(500).send({
                message: 'Internal server error'
            });
        }
    },

    deleteCart: async (req, res) => {
        const userID = req.user.userId; // Lấy userID từ JWT hoặc session
        const { itemID } = req.body; // itemID muốn xóa khỏi giỏ hàng

        try {
            // Tìm và xóa itemID khỏi giỏ hàng của người dùng
            const user = await userModel.findByIdAndUpdate(
                userID,
                {
                    $pull: {
                        cart: { itemID } // Sử dụng toán tử $pull để xóa phần tử có itemID
                    }
                },
                { new: true } // Trả về user đã được cập nhật
            ).populate('cart.itemID');

            // Kiểm tra xem có xóa thành công không
            if (!user) {
                return res.status(404).send({
                    message: 'User not found or cart is empty.'
                });
            }

            // Trả về giỏ hàng sau khi đã xóa item
            return res.status(200).send(user.cart);

        } catch (error) {
            console.error('Error in removeFromCart:', error);
            res.status(400).send({
                message: error.message,
            });
        }
    },


    uploadAvatar: async (req, res) => {
        let avatar = req.file;
        const userID = req.user.userId;
        let user = await userModel.findById(userID);
        if (user) {
            if (avatar) {
                const dataUrl = `data:${avatar.mimetype};base64,${avatar.buffer.toString('base64')}`;
                const uploaded = await cloudinary.uploader.upload(dataUrl,
                    { resource_type: 'auto' },
                    async (err, result) => {
                        if (result && result.url) {
                            user.avatar = result.url;
                            await user.save()
                            return res.status(200).json({
                                message: 'Client information updated successfully',
                                user: result.url
                            });
                        } else {
                            return res.status(500).json({
                                message: 'Error when upload file: ' + err.message
                            });
                        }
                    }
                )
            } else {
                return res.status(404).json({
                    message: 'Image not found'
                });
            }
        } else {
            return res.status(404).json({
                message: 'Client not found'
            });
        }
    },

    updateUser: async (req, res) => {
        let user = req.body;
        let userId = req.user.userId;
        let rs = await userModel.findByIdAndUpdate(
            userId,
            user
            , {
                new: true
            })
        res.status(200).send(rs)
    },

    changePassword: async (req, res) => {
        try {
            let userId = req.user.userId;
            let { oldP, newP } = req.body;

            const user = await userModel.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const isMatch = bcrypt.compareSync(oldP, user.password);
            if (!isMatch) {
                throw new Error('Old password is incorrect');
            }

            const hashedNewPassword = bcrypt.hashSync(newP, 10);
            const newUserP = await userModel.findByIdAndUpdate(userId, {
                password: hashedNewPassword
            })

            res.status(200).send({
                message: 'Password updated successfully',
                newUserP
            });
        } catch (error) {
            res.status(400).send({
                message: error.message,
            });
        }
    },

    getUserById: async (req, res) => {
        const userId = req.user.userId;
        const user = await userModel.findById(userId).populate('cart.itemID');
        res.status(200).send(user)
    }

}

export default userController;