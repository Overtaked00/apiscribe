import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ users: [] });
});

router.post('/', (req, res) => {
  res.status(201).json({ id: '1', ...req.body });
});

router.delete('/:id', (req, res) => {
  res.status(204).send();
});

export default router;
