// Core
import express from 'express';
const router = express.Router();

// Models and Middlewares
import { User } from '../app/models';
import { encrypt, decrypt } from '../app/helpers/encodeData';
import { generateJWT, verifyToken } from '../app/helpers/jwt';
import { param, body, validationResult } from 'express-validator';

// Requests
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "name",
        "email",
        "createdAt",
        "updatedAt",
      ],
    });
    res.status(200).json(users);
  } catch(err) {
    res.status(500).end();
    console.log(err)
  }
});

router.get('/:id',
  [
    verifyToken,
    param('id')
      .notEmpty().withMessage("O parâmetro 'id' é obrigatório!")
      .isInt().withMessage("O parâmetro 'id' deve ser um inteiro!"),
  ], async (req, res) => {
    const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      } else {
        try {
          const singleUser = await User.findByPk((req.params.id), {
            attributes: [
              "id",
              "name",
              "email",
              "createdAt",
              "updatedAt",
            ],
          });
          if (singleUser) {
            res.status(200).json(singleUser);
          } else {
            res.status(404).json("Usuário inexistente!");
          }
        } catch(err) {
          res.status(500).end();
          console.log(err)
        }
      }
});

router.delete('/:id',
  [
    verifyToken,
    param('id')
      .notEmpty().withMessage("O parâmetro 'id' é obrigatório!")
      .isInt().withMessage("O parâmetro 'id' deve ser um inteiro!"),
  ], async (req, res) => {
    const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      } else {
        try {
          const deleteSingleUser = await User.destroy({ where: { id: req.params.id } });
          if (deleteSingleUser) {
            res.status(200).json('Usuário deletado com sucesso!');
          } else {
            res.status(404).json("Usuário inexistente!");
          }
        } catch(err) {
          res.status(500).end();
          console.log(err)
        }
      }
});

router.patch('/:id',
  [
    verifyToken,
    param('id')
      .notEmpty().withMessage("O parâmetro 'id' é obrigatório!")
      .isInt().withMessage("O parâmetro 'id' deve ser um inteiro!"),
    body('name')
      .notEmpty().withMessage("O campo 'nome' é obrigatório!")
      .isString().withMessage("O campo 'nome' deve ser uma string!"),
    body('email')
      .notEmpty().withMessage("O campo 'email' é obrigatório!")
      .isEmail().withMessage("Email inválido!"),
    body('password')
      .notEmpty().withMessage("O campo 'senha' é obrigatório!")
      .isString().withMessage("O campo 'senha' deve ser uma string!")
      .isLength({ min: 8, max: 8 }).withMessage("A senha deve ter 8 dígitos!")
  ], async (req, res) => {
    const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      } else {
        try {
          const hashedPassword = await encrypt(req.body.password);
          const updateSingleUser = await User.update(
            {
              name: req.body.name,
              email: req.body.email,
              password: hashedPassword
            },
            { where: { id: req.params.id } }
          );
          if (Boolean(...updateSingleUser)) {
            res.status(200).json('Usuário atualizado com sucesso!');
          }
          else {
            res.status(404).json("Usuário inexistente!");
          }
        }
        catch (err) {
          res.status(500).end();
        }
      }
});

router.post('/sign_up',
  [
    body('name')
      .notEmpty().withMessage("O campo 'nome' é obrigatório!")
      .isString().withMessage("O campo 'nome' deve ser uma string!"),
    body('email')
      .notEmpty().withMessage("O campo 'email' é obrigatório!")
      .isEmail().withMessage("Email inválido!"),
    body('password')
      .notEmpty().withMessage("O campo 'senha' é obrigatório!")
      .isString().withMessage("O campo 'senha' deve ser uma string!")
      .isLength({ min: 8, max: 8 }).withMessage("A senha deve ter 8 dígitos!")
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      try {
        const existUser = await User.findOne({ where: { email: req.body.email } });
        if (existUser) {
          res.status(409).json('Esse email já está sendo usado!');
        } else {
          const hashedPassword = await encrypt(req.body.password);
          const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
          });
          res.status(201).json({
            name: user.name,
            email: user.email,
            token: generateJWT(user),
          });
        }
      } catch (err) {
        res.status(422).json(err.errors)
      }
    }
});

router.post('/login',
  [
    body('email')
      .notEmpty().withMessage("O campo 'email' é obrigatório!")
      .isEmail().withMessage("Email inválido!"),
    body('password')
      .notEmpty().withMessage("O campo 'senha' é obrigatório!")
      .isString().withMessage("O campo 'senha' deve ser uma string!")
      .isLength({ min: 8, max: 8 }).withMessage("A senha deve ter 8 dígitos!")
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      try {
        const user = await User.findOne({ where: { email: req.body.email } });
        if (user) {
          const decryptedPass = await decrypt(req.body.password, user.password);
          if (decryptedPass) {
            res.status(200).json({
              name: user.name,
              email: user.email,
              token: generateJWT(user),
            });
          } else {
            res.status(404).json('Informações incorretas!');
          }
        } else {
          res.status(404).json('Credenciais incorretas!');
        }
      } catch (err) {
        res.status(404).json(err.errors);
      }
    }
});

export default router;