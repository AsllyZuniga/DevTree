import type { Request, Response } from "express";
import { validationResult } from "express-validator";
import slug from "slug";
import formidable from "formidable";
import { v4 as uuid } from "uuid";
import User from "../models/User";
import { checkPassword, hashPassword } from "../utils/auth";
import { generateJWT } from "../utils/jwt";
import cloudinary from "../config/cloudinary";

export const createAccount = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error("El usuario ya esta registrado");
    return res.status(409).json({ error: error.message });
  }

  const handle = slug(req.body.handle, "");
  const handleExists = await User.findOne({ handle });
  if (handleExists) {
    const error = new Error("Nombre de usuario no disponible");
    return res.status(409).json({ error: error.message });
  }

  const user = new User(req.body);
  user.password = await hashPassword(password);
  user.handle = handle;

  console.log(slug(handle, ""));

  await user.save();
  res.status(201).send("Registro Creado Correctamente");
};

export const login = async (req: Request, res: Response) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  // Revisar si el usuario esta registrado
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("El usuario no existe");
    return res.status(404).json({ error: error.message });
  }

  // Comprobar el password
  const isPasswordCorrect = await checkPassword(
    password,
    user.password.toString(),
  );
  if (!isPasswordCorrect) {
    const error = new Error("Password Incorrecto");
    return res.status(401).json({ error: error.message });
  }
  const token = generateJWT({ id: user._id });

  res.send(token);
};

export const getUser = async (req: Request, res: Response) => {
  res.json(req.user);
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    const handle = slug(req.body.handle, "");
    const handleExists = await User.findOne({ handle });
    if (handleExists && handleExists.email !== req.user.email) {
      const error = new Error("Nombre de usuario no disponible");
      return res.status(409).json({ error: error.message });
    }
    req.user.description = description;
    req.user.handle = handle;
    await req.user.save();
    res.send("Perfil actualizado correctamente");
  } catch (e) {
    const error = new Error("Error al actualizar el perfil");
    res.status(500).json({ error: error.message });
  }
};
export const uploadImage = async (req: Request, res: Response) => {
  const form = formidable({ multiples: false });

  try {
    form.parse(req, async (error, fields, files) => {
      cloudinary.uploader.upload(
        files.file[0].filepath,
        { public_id: uuid() },
        async function (error, result) {
          if (error) {
            const error = new Error("Error al subir la imagen");
            return res.status(500).json({ error: error.message });
          }
          if (result) {
            req.user.image = result.secure_url;
            await req.user.save();
            res.json({ image: result.secure_url });
          }
        },
      );
    });
  } catch (e) {
    const error = new Error("Hubo un error");
    res.status(500).json({ error: error.message });
  }
};
