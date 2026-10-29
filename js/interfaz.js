/**
 * interfaz.js — MANIPULACIÓN DEL DOM
 * Tarea 4: Calculadora básica y científica
 *
 * Responsabilidades:
 *  - Capturar los clics de los botones (un solo listener, delegación de eventos)
 *  - Mantener el estado de la calculadora
 *  - Pedir los cálculos al módulo Calculadora (calculadora.js)
 *  - Actualizar la pantalla y las clases CSS según el estado
 *
 * Nota: la calculadora solo se usa con botones; no hay listeners de teclado.
 */
(() => {
  'use strict';

  const MAX_DIGITOS = 16; // límite de caracteres al escribir un número

  /* ---------- Referencias al DOM ---------- */
  const calculadora = document.getElementById('calculadora');
  const pantallaResultado = document.getElementById('resultado');
  const pantallaExpresion = document.getElementById('expresion');
  const indicadorAngulo = document.getElementById('indicador-angulo');
  const botonesModo = document.querySelectorAll('.modo');
  const teclasCientificas = document.querySelectorAll('.panel-cientifico .tecla');
  const teclasOperador = document.querySelectorAll('[data-accion="operador"]');
  const teclaAngulo = document.querySelector('[data-accion="angulo"]');

  /* ---------- Estado ---------- */
  const estado = {
    actual: '0',          // texto del número en pantalla
    anterior: null,       // primer operando (Number) o null
    operador: null,       // 'suma', 'resta', ..., 'potencia'
    esperandoNuevo: false,// true → el siguiente dígito reemplaza al actual
    error: false,         // true → hay un mensaje de error en pantalla
    modo: 'basico',       // 'basico' | 'cientifico'
    modoAngular: 'deg',   // 'deg' | 'rad'
  };

  /* =========================================================
     Funciones de pantalla
     ========================================================= */

  /** Da formato a un número para mostrarlo (exponencial si es muy grande o muy pequeño) */
  function formatear(numero) {
    const abs = Math.abs(numero);
    if (abs !== 0 && (abs >= 1e16 || abs < 1e-9)) {
      return numero.toExponential(8).replace(/\.?0+e/, 'e');
    }
    return String(numero);
  }

  /** Reemplaza el guion por el signo menos tipográfico solo para mostrar */
  function mostrarNumero(texto) {
    return texto.replace(/^-/, '−');
  }

  /** Escribe el estado actual en la pantalla */
  function actualizarPantalla(expresion = null) {
    pantallaResultado.textContent = mostrarNumero(estado.actual);
    pantallaResultado.classList.toggle('largo', estado.actual.length > 11);

    if (expresion !== null) {
      pantallaExpresion.textContent = expresion;
    } else if (estado.operador !== null) {
      pantallaExpresion.textContent =
        `${mostrarNumero(formatear(estado.anterior))} ${Calculadora.simbolo(estado.operador)}`;
    } else {
      pantallaExpresion.textContent = '';
    }

    marcarOperadorActivo();
  }

  /** Resalta el botón del operador pendiente mientras se escribe el segundo número */
  function marcarOperadorActivo() {
    teclasOperador.forEach((tecla) => {
      const activo = estado.esperandoNuevo && tecla.dataset.op === estado.operador;
      tecla.classList.toggle('operador-activo', activo);
    });
  }

  /** Muestra un mensaje de error y deja la calculadora lista para reiniciar */
  function mostrarError(mensaje) {
    estado.actual = '0';
    estado.anterior = null;
    estado.operador = null;
    estado.esperandoNuevo = true;
    estado.error = true;

    pantallaExpresion.textContent = '';
    pantallaResultado.textContent = mensaje;
    pantallaResultado.classList.remove('largo');
    calculadora.classList.add('con-error');
    marcarOperadorActivo();
  }

  /** Quita el estado de error (al presionar cualquier tecla después del error) */
  function quitarError() {
    if (!estado.error) return;
    estado.error = false;
    calculadora.classList.remove('con-error');
  }

  /**
   * Ejecuta un cálculo protegido: si la lógica lanza un ErrorCalculo
   * se muestra en pantalla; cualquier otro error se reporta en consola.
   * Devuelve el resultado o null si hubo error.
   */
  function calcularSeguro(funcionCalculo) {
    try {
      return funcionCalculo();
    } catch (err) {
      if (err instanceof Calculadora.ErrorCalculo) {
        mostrarError(err.message);
      } else {
        console.error(err);
        mostrarError('Error');
      }
      return null;
    }
  }

  /* =========================================================
     Acciones de los botones
     ========================================================= */

  function ingresarNumero(digito) {
    if (estado.esperandoNuevo) {
      estado.actual = digito;
      estado.esperandoNuevo = false;
    } else if (estado.actual.replace('-', '').length >= MAX_DIGITOS) {
      return; // no se aceptan más dígitos
    } else {
      estado.actual = estado.actual === '0' ? digito
        : estado.actual === '-0' ? '-' + digito
        : estado.actual + digito;
    }
    actualizarPantalla();
  }

  function ingresarDecimal() {
    if (estado.esperandoNuevo) {
      estado.actual = '0.';
      estado.esperandoNuevo = false;
    } else if (!estado.actual.includes('.')) {
      estado.actual += '.';
    }
    actualizarPantalla();
  }

  function elegirOperador(op) {
    const valor = parseFloat(estado.actual);

    if (estado.operador !== null && !estado.esperandoNuevo) {
      // Encadenar operaciones: 2 + 3 × → calcula 5 y sigue con ×
      const resultado = calcularSeguro(() =>
        Calculadora.operarBinaria(estado.operador, estado.anterior, valor));
      if (resultado === null) return;
      estado.anterior = resultado;
      estado.actual = formatear(resultado);
    } else if (estado.operador === null || !estado.esperandoNuevo) {
      estado.anterior = valor;
    }
    // Si ya había operador y aún no se escribe el 2.º número, solo se cambia el operador

    estado.operador = op;
    estado.esperandoNuevo = true;
    actualizarPantalla();
  }

  function calcularIgual() {
    if (estado.operador === null) return;

    const a = estado.anterior;
    const b = parseFloat(estado.actual);
    const op = estado.operador;

    const resultado = calcularSeguro(() => Calculadora.operarBinaria(op, a, b));
    if (resultado === null) return;

    const expresion =
      `${mostrarNumero(formatear(a))} ${Calculadora.simbolo(op)} ${mostrarNumero(formatear(b))} =`;

    estado.actual = formatear(resultado);
    estado.anterior = null;
    estado.operador = null;
    estado.esperandoNuevo = true;
    actualizarPantalla(expresion);
  }

  function aplicarPorcentaje() {
    const valor = parseFloat(estado.actual);
    const resultado = calcularSeguro(() =>
      Calculadora.porcentaje(valor, estado.anterior, estado.operador));
    if (resultado === null) return;

    estado.actual = formatear(resultado);
    estado.esperandoNuevo = false; // se puede seguir con = o con otro operador
    actualizarPantalla();
  }

  /** Funciones científicas: se aplican sobre el valor actual en pantalla */
  function aplicarFuncion(nombre) {
    const valor = parseFloat(estado.actual);
    const resultado = calcularSeguro(() =>
      Calculadora.aplicarFuncion(nombre, valor, estado.modoAngular));
    if (resultado === null) return;

    let expresion = Calculadora.etiqueta(nombre, mostrarNumero(formatear(valor)));
    if (['seno', 'coseno', 'tangente'].includes(nombre)) {
      expresion += estado.modoAngular === 'deg' ? '°' : ' rad';
    }
    // Si hay una operación pendiente, se conserva a la izquierda
    if (estado.operador !== null) {
      expresion = `${mostrarNumero(formatear(estado.anterior))} ${Calculadora.simbolo(estado.operador)} ${expresion}`;
    }

    estado.actual = formatear(resultado);
    estado.esperandoNuevo = true;
    actualizarPantalla(`${expresion} =`);
  }

  function cambiarSigno() {
    if (estado.actual === '0') return;
    estado.actual = estado.actual.startsWith('-')
      ? estado.actual.slice(1)
      : '-' + estado.actual;
    actualizarPantalla();
  }

  function borrarDigito() {
    if (estado.esperandoNuevo) return; // no se borra un resultado
    estado.actual = estado.actual.slice(0, -1);
    if (estado.actual === '' || estado.actual === '-') estado.actual = '0';
    actualizarPantalla();
  }

  /** Limpia completamente la pantalla y el estado */
  function limpiar() {
    estado.actual = '0';
    estado.anterior = null;
    estado.operador = null;
    estado.esperandoNuevo = false;
    quitarError();
    actualizarPantalla('');
  }

  function cambiarModoAngular() {
    estado.modoAngular = estado.modoAngular === 'deg' ? 'rad' : 'deg';
    const texto = estado.modoAngular.toUpperCase();
    teclaAngulo.textContent = texto;
    indicadorAngulo.textContent = texto;
  }

  /** Cambia entre modo básico y científico (clases CSS + habilitar/deshabilitar) */
  function cambiarModo(modo) {
    if (modo === estado.modo) return;
    estado.modo = modo;
    const cientifico = modo === 'cientifico';

    calculadora.classList.toggle('modo-cientifico', cientifico);

    botonesModo.forEach((boton) => {
      const seleccionado = boton.dataset.modo === modo;
      boton.classList.toggle('seleccionado', seleccionado);
      boton.setAttribute('aria-pressed', String(seleccionado));
    });

    teclasCientificas.forEach((tecla) => { tecla.disabled = !cientifico; });

    // Si se estaba usando xⁿ y se regresa a básico, se cancela esa operación
    if (!cientifico && estado.operador === 'potencia') {
      estado.operador = null;
      estado.anterior = null;
      estado.esperandoNuevo = false;
      actualizarPantalla();
    }
  }

  /* =========================================================
     Eventos
     ========================================================= */

  /** Tabla acción → función (evita un switch largo) */
  const ACCIONES = {
    numero:     (tecla) => ingresarNumero(tecla.dataset.valor),
    decimal:    () => ingresarDecimal(),
    operador:   (tecla) => elegirOperador(tecla.dataset.op),
    igual:      () => calcularIgual(),
    porcentaje: () => aplicarPorcentaje(),
    funcion:    (tecla) => aplicarFuncion(tecla.dataset.fn),
    signo:      () => cambiarSigno(),
    borrar:     () => borrarDigito(),
    limpiar:    () => limpiar(),
    angulo:     () => cambiarModoAngular(),
  };

  /** Efecto visual breve de "tecla presionada" */
  function animarTecla(tecla) {
    tecla.classList.add('presionada');
    setTimeout(() => tecla.classList.remove('presionada'), 120);
  }

  // Un solo listener para todo el teclado (delegación de eventos)
  calculadora.addEventListener('click', (evento) => {
    const tecla = evento.target.closest('.tecla');
    if (!tecla || tecla.disabled) return;

    const accion = ACCIONES[tecla.dataset.accion];
    if (!accion) return;

    // Después de un error, cualquier tecla empieza de cero
    if (estado.error) {
      quitarError();
      if (tecla.dataset.accion !== 'numero' && tecla.dataset.accion !== 'decimal'
          && tecla.dataset.accion !== 'angulo') {
        limpiar();
        animarTecla(tecla);
        return;
      }
    }

    animarTecla(tecla);
    accion(tecla);
  });

  botonesModo.forEach((boton) => {
    boton.addEventListener('click', () => cambiarModo(boton.dataset.modo));
  });

  /* ---------- Estado inicial ---------- */
  teclasCientificas.forEach((tecla) => { tecla.disabled = true; });
  actualizarPantalla('');
})();
