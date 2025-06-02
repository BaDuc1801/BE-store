import userModel from "../model/user.schema.js"
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv';
import mongoose from "mongoose";
dotenv.config();

const getCloudinaryConfig = JSON.parse(process.env.CLOUD_DINARY_CONFIG);
cloudinary.config(getCloudinaryConfig);

const userController = {
    getUsers: async (req, res) => {
        const listUser = await userModel.find().populate('favourites').populate('cart');
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

    addToFavourite: async (req, res) => {
        const userID = req.user.userId
        const { itemID } = req.body;
        try {
            const user = await userModel.findById(userID);
            if (!user) throw new Error('User not found')
            if (user.favourites.includes(itemID)) throw new Error('Product already in cart');
            user.favourites.push(itemID);
            await user.save();
            res.status(200).send({
                message: 'Product already in favourite',
                data: user
            })
        } catch (error) {
            res.status(400).send({
                message: error.message
            })
        }
    },

    addToCart: async (req, res) => {
        const userID = req.user.userId;
        const { itemID } = req.body;

        try {
            const user = await userModel.findById(userID);

            if (!user) {
                throw new Error('User not found');
            }

            // Tìm xem sản phẩm đã có trong giỏ hàng hay chưa
        const itemIndex = user.cart.findIndex(item => item.itemID.toString() === itemID.toString());

            if (itemIndex > -1) {
                // Nếu sản phẩm đã có trong giỏ, tăng số lượng
                user.cart[itemIndex].quantity += 1;
            } else {
                // Nếu sản phẩm chưa có, thêm mới vào giỏ
                user.cart.push({ itemID: itemID, quantity: 1 });
            }

            // Lưu lại thay đổi vào cơ sở dữ liệu
            await user.save();
            res.status(200).send(user.cart);

        } catch (error) {
            console.error('Error in addToCart:', error);
            res.status(400).send({
                message: error.message
            });
        }
    },

    deleteFavourite: async (req, res) => {
        const userID = req.user.userId;
        const { itemID } = req.body;

        try {
            const user = await userModel.findById(userID);
            if (!user) {
                return res.status(404).send({
                    message: 'User not found'
                });
            }
            const itemIndex = user.favourites.findIndex(fav => fav._id.toString() === itemID);

            if (itemIndex === -1) {
                return res.status(400).send({
                    message: 'Item not found in favourites'
                });
            }

            user.favourites.splice(itemIndex, 1);
            await user.save();

            res.status(200).send({
                message: 'Item removed from favourites successfully',
                data: user
            });
        } catch (error) {
            console.error('Error in deleteFavourite:', error);
            res.status(500).send({
                message: 'Internal server error'
            });
        }
    },


    deleteCart: async (req, res) => {
        const userID = req.user.userId;
        const { itemID } = req.body;

        try {
            const user = await userModel.findById(userID);
            if (!user) {
                return res.status(404).send({
                    message: 'User not found'
                });
            }
            const itemIndex = user.cart.findIndex(fav => fav._id.toString() === itemID);

            if (itemIndex === -1) {
                return res.status(400).send({
                    message: 'Item not found in cart'
                });
            }

            user.cart.splice(itemIndex, 1);
            await user.save();

            res.status(200).send({
                message: 'Item removed from favourites successfully',
                data: user
            });
        } catch (error) {
            console.error('Error in deleteFavourite:', error);
            res.status(500).send({
                message: 'Internal server error'
            });
        }
    },

    uploadAvatar: async (req, res) => {
        let avatar = req.file;
        let { email } = req.query;
        let user = await userModel.findOne({ email: email });
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
        )
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
        const user = await userModel.findById(userId).populate('favourites').populate('cart');
        res.status(200).send(user)
    }

}

export default userController;