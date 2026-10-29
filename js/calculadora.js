/**
 * calculadora.js — LÓGICA DE CÁLCULO
 * Tarea 4: Calculadora básica y científica
 *
 * Este archivo NO toca el DOM: solo recibe números y devuelve números,
 * o lanza un ErrorCalculo cuando la operación no es válida.
 * La interfaz (interfaz.js) se encarga de mostrar el resultado o el error.
 */
const Calculadora = (() => {
  'use strict';

  /** Error propio para distinguir errores matemáticos de errores de programación */
  class ErrorCalculo extends Error {
    constructor(mensaje) {
      super(mensaje);
      this.name = 'ErrorCalculo';
    }
  }

  const EPSILON = 1e-12;     // tolerancia para el ruido de punto flotante
  const MAX_FACTORIAL = 170; // 171! ya excede el máximo de Number en JS

  /* =========================================================
     Utilidades
     ========================================================= */

  /**
   * Revisa que el resultado sea un número válido y quita el ruido
   * de punto flotante (por ejemplo 0.1 + 0.2 = 0.30000000000000004 → 0.3).
   */
  function validarResultado(valor) {
    if (Number.isNaN(valor)) throw new ErrorCalculo('Resultado indefinido');
    if (!Number.isFinite(valor)) throw new ErrorCalculo('Resultado fuera de rango');
    return parseFloat(valor.toPrecision(12));
  }

  /** Convierte el ángulo a radianes si el modo angular es 'deg' */
  function aRadianes(x, modoAngular) {
    return modoAngular === 'deg' ? ((x % 360) * Math.PI) / 180 : x;
  }

  /** sin(180°) da 1.22e-16 por la aproximación de π; aquí lo dejamos en 0 */
  function ajustarCero(valor) {
    return Math.abs(valor) < EPSILON ? 0 : valor;
  }

  /* =========================================================
     Operaciones básicas
     ========================================================= */

  function sumar(a, b) { return a + b; }

  function restar(a, b) { return a - b; }

  function multiplicar(a, b) { return a * b; }

  function dividir(a, b) {
    if (b === 0) throw new ErrorCalculo('No se puede dividir entre 0');
    return a / b;
  }

  /**
   * Porcentaje al estilo de las calculadoras de bolsillo:
   *   200 + 10 %  → 20   (10 % de 200; al presionar = da 220)
   *   200 × 10 %  → 0.1  (al presionar = da 20)
   *   50 %        → 0.5
   */
  function porcentaje(valor, base = null, operador = null) {
    if (base !== null && (operador === 'suma' || operador === 'resta')) {
      return validarResultado((base * valor) / 100);
    }
    return validarResultado(valor / 100);
  }

  /* =========================================================
     Operaciones científicas
     ========================================================= */

  function raizCuadrada(x) {
    if (x < 0) throw new ErrorCalculo('Raíz de un número negativo');
    return Math.sqrt(x);
  }

  function cuadrado(x) { return x * x; }

  function potencia(base, exponente) {
    if (base === 0 && exponente < 0) throw new ErrorCalculo('No se puede dividir entre 0');
    const resultado = Math.pow(base, exponente);
    // Ej. (-8)^0.5 no tiene resultado real
    if (Number.isNaN(resultado)) throw new ErrorCalculo('Potencia no válida');
    return resultado;
  }

  function seno(x, modoAngular) {
    return ajustarCero(Math.sin(aRadianes(x, modoAngular)));
  }

  function coseno(x, modoAngular) {
    return ajustarCero(Math.cos(aRadianes(x, modoAngular)));
  }

  function tangente(x, modoAngular) {
    const rad = aRadianes(x, modoAngular);
    // tan(x) = sin/cos → indefinida cuando cos(x) = 0 (90°, 270°, ...)
    if (Math.abs(Math.cos(rad)) < EPSILON) throw new ErrorCalculo('tan(x) no está definida');
    return ajustarCero(Math.tan(rad));
  }

  function factorial(x) {
    if (x < 0) throw new ErrorCalculo('Factorial de un número negativo');
    if (!Number.isInteger(x)) throw new ErrorCalculo('Factorial solo de enteros');
    if (x > MAX_FACTORIAL) throw new ErrorCalculo('Número demasiado grande');
    let resultado = 1;
    for (let i = 2; i <= x; i++) resultado *= i;
    return resultado;
  }

  /* =========================================================
     Tablas de operaciones
     (evitan un switch enorme y la duplicación de código)
     ========================================================= */

  /** Operaciones de dos operandos: a (op) b */
  const OPERACIONES_BINARIAS = {
    suma:           { simbolo: '+', calcular: sumar },
    resta:          { simbolo: '−', calcular: restar },
    multiplicacion: { simbolo: '×', calcular: multiplicar },
    division:       { simbolo: '÷', calcular: dividir },
    potencia:       { simbolo: '^', calcular: potencia },
  };

  /** Funciones de un operando: se aplican al valor actual en pantalla */
  const FUNCIONES = {
    raiz:      { etiqueta: (x) => `√(${x})`,   calcular: raizCuadrada },
    cuadrado:  { etiqueta: (x) => `(${x})²`,   calcular: cuadrado },
    seno:      { etiqueta: (x) => `sin(${x})`, calcular: seno },
    coseno:    { etiqueta: (x) => `cos(${x})`, calcular: coseno },
    tangente:  { etiqueta: (x) => `tan(${x})`, calcular: tangente },
    factorial: { etiqueta: (x) => `${x}!`,     calcular: factorial },
  };

  /* =========================================================
     API pública
     ========================================================= */

  /** Ejecuta a (op) b, p. ej. operarBinaria('division', 10, 4) → 2.5 */
  function operarBinaria(op, a, b) {
    const operacion = OPERACIONES_BINARIAS[op];
    if (!operacion) throw new Error(`Operación desconocida: ${op}`);
    return validarResultado(operacion.calcular(a, b));
  }

  /** Aplica una función, p. ej. aplicarFuncion('seno', 30, 'deg') → 0.5 */
  function aplicarFuncion(nombre, x, modoAngular = 'deg') {
    const funcion = FUNCIONES[nombre];
    if (!funcion) throw new Error(`Función desconocida: ${nombre}`);
    return validarResultado(funcion.calcular(x, modoAngular));
  }

  /** Símbolo para mostrar en pantalla (suma → +) */
  function simbolo(op) {
    return OPERACIONES_BINARIAS[op] ? OPERACIONES_BINARIAS[op].simbolo : '';
  }

  /** Texto de la función aplicada (seno, 30 → sin(30)) */
  function etiqueta(nombre, x) {
    return FUNCIONES[nombre] ? FUNCIONES[nombre].etiqueta(x) : '';
  }

  return Object.freeze({
    operarBinaria,
    aplicarFuncion,
    porcentaje,
    simbolo,
    etiqueta,
    ErrorCalculo,
  });
})();

// Permite probar la lógica con Node.js sin afectar al navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculadora;
}
