/**
 * Backlog: texto literal solo para Super (isSuper).
 * Resúmenes ultra cortos para Admin (role admin sin isSuper).
 */

export const RELEASE_NOTES_TITLE =
  'Correcciones y nuevas caracteristicas implementadas  (desde Backlog)';

/** Texto tal cual backlog — un elemento por ítem enumerado */
export const BACKLOG_RAW_ITEMS = [
  'Prod:Payments Negativos ',
  'Prod: Ver eliminar pagos, o poner pagos en 0',
  'Poner en pagos , el destinatario del pago? , o sea , a quien se le paga?',
  'Agregar pasajero no deja agregar acompañante? y en la segundo intento , si deja? ',
  'Test:pasar botón nueva venta a la barra lateral , e integrar sales c balanza de pagos ',
  'Listados  de saldos proveedores y clientes y conciliacion',
  'priroidad, esta descontrolado el tema fechas, fijate de cargar un nuevo pasajero y ponele la fecha de ncaimiento vas a ver que te la cambia un dia antes y tambien  creacion de venta dede cupos, ahi te pide fecha salida 01/07/2026 (seleccionando desde el calendario del sistema  incluso) y regreso 08/07/2026 y cuando lo grabamos te cambia no solo el formato sino que adelanta un dia el regreso y a veces tambien la salida.\nse ve que ahy un problema general con las fechas en el sistema o las zonas horarias',
  'No esta filtrando bien la busqueda de pasajeros por apellido',
  'Relacionar , una vez creada la venta, el proveedor con el servicio y en pago a proveedores establecer un campo , donde se especificque jsutamente el proveedor al cual se le va a imputar ese pago, y la forma de pago es otra tablita como esta ahora (deposito, pagos directo del pasajero, trasnferencias etc)',
  'Revisar la ficha del pasajero titular y acompañante ya que extrae datos del dni pero luego cuando la volves a abrir no lo recupera.',
  'va a haber que poner una especi de restriccion, cuando el sistema ve un dni o un pasaporte ya cargado, asi evitamos la duplicidad de pasajeros',
  'hacer obligatorio en carga de pasajero titular  mail o whtasapp, una de esas 2 y dni o pasaporte,  conque se cumpla un requisito de ambos esta bien, ojo que ahora es obligatorio lo dni',
  'agregar la palabra destino en el flujo de creacion de venta , como titulo o referencia general  diria yo ,  y sacar del flujo la palabra ciudad',
  'en Sales, en filtros debemos agregar  un filtro "fecha de creacion" Recordar que hoy en dia dice fecha de inicio y fecha de finalizacion , pero eso seria del viaje',
  'Recordar que el listado de SAles no trae todas las ventas , cuando seleccionas todos los vendedores, esta limitado a la primera pagina y no aparece la posibilidad de siguiente pagina o simplemente no se lista',
  'borrar del listado de Sales el menu que hicsite para filtrar por proveedor y pasajero, no hace faltaen la imagen que adjunto, deberian mostrarse en la barrita los  totales que se fueron apgando a proveedore de la reserva',
  ' poder ver de un solo vistazo los saldos de proveedores y de pasajeros dentro del mismo listado , aca, mas alla de que puedas filtrar por pasajero y por proveedor y despues tambien se deberia agregar una columna mas de saldo de comision en los casos que exista',
  'fijate ahi en sales que dice 11 reservas, eso es porque lee solo la cantida de las que ve ej la pagina 1 pero hay varias pagainas de reservas ',
  'también en solapa ventas hay que agregar un campo con fecha de creacion de la reserva, ya que ahora solo figura la fecha que comienza un servicio o venta  y la fecha en la que termina',
  'Permanencia de las imágenes ',
  'agregar campo de comiison  y cta cte de comison de vendedores y stearla con un porcetnajte de comision estatico y tambien seteable',
  'revisar la estimacion del costo y cantidad de pasajeros en una venta desde Cupos',
  'Ingles/castellano títulos y contenido tambien',
  'cargar un campo para agregar numero de file del operador',
  'Direccionamiento desde la URL de la agencia (www.traveltech.marenostrum.tur) o cual se el nombre de nuestro sistema',
  'Control de usuarios y claves , claves básicas , historial , entrar por usuario, reseteo de clave',
  'Prod:Personalización de la agencia (logo/ID título) , base? Usuario hora/fecha',
  'Bloqueo de alta de usuarios para cada agencia  y de uso simultaneo, para que no usen el mismo usuario 2 personas., auqe  no se si es facil o friendly hacer eso (Super admin, solo este usuario puede dar de alta usuarios , es un usuario por default que tendrá el Sistema)',
];

/** Mismo orden que BACKLOG_RAW_ITEMS — resumen ultra corto para Admin */
export const BACKLOG_ADMIN_SUMMARIES = [
  'Pagos negativos en producción.',
  'Ver / eliminar pagos o poner monto en 0.',
  'Mostrar a quién va dirigido cada pago.',
  'Bug: acompañante no en 1.er intento, sí en el 2.º.',
  'Nueva venta en barra lateral + integrar ventas con balanza de pagos.',
  'Listados saldos prov./clientes y conciliación.',
  'Prioridad: fechas (nacimiento, cupos, TZ) desfasadas al guardar.',
  'Filtro de pasajeros por apellido falla.',
  'Imputar pago a proveedor + tabla forma de pago (depósito, etc.).',
  'Datos del DNI en ficha no se recuperan al reabrir.',
  'Bloquear duplicados por DNI/pasaporte ya cargado.',
  'Obligar mail o WA + DNI o pasaporte (flexible, no solo DNI).',
  'En venta: título "destino"; sacar "ciudad".',
  'Filtro fecha creación en Sales (inicio/fin = viaje).',
  'Listado ventas incompleto / sin paginar con "todos los vendedores".',
  'Quitar filtros prov./pasajero en Sales; totales pagados a prov. en barra.',
  'Saldos prov./pasajeros en listado + columna comisión si aplica.',
  'Contador "N reservas" solo cuenta página actual.',
  'Columna fecha creación de la reserva en ventas.',
  'Permanencia de imágenes.',
  'Comisión vendedores + cuenta corriente; % fijo y configurable.',
  'Revisar costo y cant. pasajeros en venta desde cupos.',
  'Homogeneizar títulos ES/EN.',
  'Campo número de file del operador.',
  'URL pública / nombre del sistema.',
  'Políticas de clave, historial, reset por usuario.',
  'Personalización agencia: logo, ID, título, base, hora/fecha.',
  'Bloqueo altas por agencia, sesión única; solo super admin da altas.',
];
