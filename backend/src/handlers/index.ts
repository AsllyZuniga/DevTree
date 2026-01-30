import type { Request, Response } from "express";
import { validationResult } from "express-validator";
import slug from "slug";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { checkPassword, hashPassword } from "../utils/auth";
import { generateJWT } from "../utils/jwt";

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
  const bearer = req.headers.authorization;

  if (!bearer) {
    const error = new Error("No Autorizado");
    return res.status(401).json({ error: error.message });
  }

  const [, token] = bearer.split(" ");
  if (!token) {
    const error = new Error("No Autorizado");
    return res.status(401).json({ error: error.message });
  }

  try {
    const result = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof result === "object" && result.id) {
      const user = (await User.findById(result.id)).isSelected("name handle");
      if (!user) {
        const error = new Error("El usuario no existe");
        return res.status(404).json({ error: error.message });
      }
      res.json(user);
    }
  } catch (error) {
    res.status(500).json({ error: "Token No Válido" });
  }
};
