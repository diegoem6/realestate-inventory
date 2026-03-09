const mongoose = require('mongoose');
const User = require('./models/User');
const Template = require('./models/Template');
require('dotenv').config();

const defaultTemplates = [
  { nombre: 'Fachada', orden: 1, esDefault: true, tuplas: [
    { campo: 'Terminación', valorDefault: 'Buen estado' },
    { campo: 'Aberturas', valorDefault: 'Buen estado' },
    { campo: 'Puerta de entrada', valorDefault: 'Buen estado' },
    { campo: 'Cerr. predio', valorDefault: 'Si. Buen estado' },
    { campo: 'Porton', valorDefault: 'Buen estado' },
    { campo: 'Vidrio', valorDefault: 'Buen estado' },
    { campo: 'Timbre', valorDefault: 'Si. Funcionando' }
  ]},
  { nombre: 'Predio', orden: 2, esDefault: true, tuplas: [
    { campo: 'Cerramiento', valorDefault: 'Si - Buen estado' },
    { campo: 'Puerta exterior', valorDefault: 'Buen estado' },
    { campo: 'Portones', valorDefault: 'Si - Buen estado' },
    { campo: 'Vidrios', valorDefault: 'Sin roturas' },
    { campo: 'Grifería', valorDefault: 'Buen estado' },
    { campo: 'Eléctrica', valorDefault: 'Buen estado' }
  ]},
  { nombre: 'Garage', orden: 3, esDefault: true, tuplas: [
    { campo: 'Cerramiento', valorDefault: 'Buen estado' },
    { campo: 'Puerta exterior', valorDefault: 'Buen estado' },
    { campo: 'Portones', valorDefault: 'Buen estado' },
    { campo: 'Vidrios', valorDefault: 'Sin roturas' },
    { campo: 'Grifería', valorDefault: 'Buen estado' },
    { campo: 'Eléctrica', valorDefault: 'Buen estado' },
    { campo: 'Pintura', valorDefault: 'Buen estado' },
    { campo: 'Terminación', valorDefault: 'Buen estado' },
    { campo: 'Techo', valorDefault: 'Buen estado' }
  ]},
  { nombre: 'Cocina', orden: 4, esDefault: true, tuplas: [
    { campo: 'Puerta', valorDefault: 'Buen estado' },
    { campo: 'Ventana', valorDefault: 'Buen estado' },
    { campo: 'Cortinas', valorDefault: 'Buen estado' },
    { campo: 'Cerraduras', valorDefault: 'Buen estado' },
    { campo: 'Paredes', valorDefault: 'Buen estado' },
    { campo: 'Cielorraso', valorDefault: 'Buen estado' },
    { campo: 'Pisos', valorDefault: 'Buen estado' },
    { campo: 'Revestimiento', valorDefault: 'Buen estado' },
    { campo: 'Mesada', valorDefault: 'Buen estado' },
    { campo: 'Grifería', valorDefault: 'Buen estado' },
    { campo: 'Placares', valorDefault: 'Buen estado' },
    { campo: 'Electrica', valorDefault: 'Buen estado' },
    { campo: 'Extractor', valorDefault: 'Buen estado' },
  ]},
  { nombre: 'Living-comedor', orden: 5, esDefault: true, tuplas: [
    { campo: 'Piso', valorDefault: '' },
    { campo: 'Paredes', valorDefault: '' },
    { campo: 'Cielo raso', valorDefault: '' },
    { campo: 'Ventanas', valorDefault: '' },
    { campo: 'Iluminación', valorDefault: '' },
  ]},
  { nombre: 'Baño', orden: 6, esDefault: true, tuplas: [
    { campo: 'Sanitarios', valorDefault: '' },
    { campo: 'Canillas/Ducha', valorDefault: '' },
    { campo: 'Azulejos', valorDefault: '' },
    { campo: 'Piso', valorDefault: '' },
    { campo: 'Espejo', valorDefault: '' },
    { campo: 'Mueble bajo mesada', valorDefault: '' },
  ]},
  { nombre: 'Habitación 1', orden: 7, esDefault: true, tuplas: [
    { campo: 'Piso', valorDefault: '' },
    { campo: 'Paredes', valorDefault: '' },
    { campo: 'Cielo raso', valorDefault: '' },
    { campo: 'Ventanas', valorDefault: '' },
    { campo: 'Placard', valorDefault: '' },
  ]},
  { nombre: 'Habitación 2', orden: 8, esDefault: true, tuplas: [
    { campo: 'Piso', valorDefault: '' },
    { campo: 'Paredes', valorDefault: '' },
    { campo: 'Cielo raso', valorDefault: '' },
    { campo: 'Ventanas', valorDefault: '' },
    { campo: 'Placard', valorDefault: '' },
  ]},
  { nombre: 'Consumos', orden: 9, esDefault: true, tuplas: [
    { campo: 'Lectura medidor luz', valorDefault: '' },
    { campo: 'Lectura medidor agua', valorDefault: '' },
    { campo: 'Lectura medidor gas', valorDefault: '' },
    { campo: 'Número medidor luz', valorDefault: '' },
    { campo: 'Número medidor agua', valorDefault: '' },
    { campo: 'Número medidor gas', valorDefault: '' },
  ]},
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Create admin user
  const adminExists = await User.findOne({ rol: 'admin' });
  if (!adminExists) {
    await User.create({
      username: 'admin',
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@inventarios.com',
      password: 'Admin1234!',
      rol: 'admin',
    });
    console.log('✓ Admin user created - username: admin / password: Admin1234!');
  }

  // Create default templates
  const existingTemplates = await Template.countDocuments();
  if (existingTemplates === 0) {
    await Template.insertMany(defaultTemplates);
    console.log('✓ Default templates created');
  }

  await mongoose.disconnect();
  console.log('Seed complete!');
}

seed().catch(err => { console.error(err); process.exit(1); });
