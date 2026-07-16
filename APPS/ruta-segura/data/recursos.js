// Contenido real tomado de Directorio_de_Recursos_EEUU_Julio_2026.pdf (freelancer, jul-2026).
// Solo cubre las categorías que ya existen en categorias.js: 'legal' y 'violencia'.
// Vivienda/empleo del directorio no tienen categoría propia todavía — ver NOTAS/ajustes app ruta.txt.
export const RECURSOS = {
  Florida: {
    legal: [
      { nombre: 'The Florida Bar – Lawyer Referral Service', desc: 'Referencia oficial a abogados licenciados en Florida; permite solicitar el área jurídica necesaria.', contacto: '800-342-8011', sitio: 'www.floridabar.org/public/lrs' },
      { nombre: 'AILA South Florida Chapter', desc: 'Directorio de abogados de inmigración miembros de AILA.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'Florida Courts Help – Legal Services', desc: 'Portal oficial con directorios de abogados, asistencia legal y recursos por condado.', contacto: null, sitio: 'help.flcourts.gov/Legal-Services-Resources' },
      { nombre: 'Florida Law Help', desc: 'Directorio estatal de organizaciones de ayuda legal gratuita o de bajo costo.', contacto: null, sitio: 'www.floridalawhelp.org' },
      { nombre: 'Legal Services of Greater Miami', desc: 'Ayuda civil gratuita para residentes elegibles de Miami-Dade y Monroe.', contacto: '305-576-0080', sitio: 'www.legalservicesmiami.org' },
      { nombre: 'Coast to Coast Legal Aid of South Florida', desc: 'Asistencia civil gratuita para personas elegibles en Broward y áreas atendidas.', contacto: '954-736-2400', sitio: 'www.coasttocoastlegalaid.org' },
    ],
    violencia: [
      { nombre: 'Florida Domestic Violence Hotline', desc: 'Línea estatal confidencial para seguridad, refugio y conexión con centros locales.', contacto: '800-500-1119', sitio: 'www.fcadv.org' },
      { nombre: 'Women In Distress of Broward County', desc: 'Refugio, línea de crisis, asesoría y apoyo para sobrevivientes.', contacto: '954-761-1133', sitio: 'www.womenindistress.org' },
      { nombre: 'The Lodge – Miami-Dade', desc: 'Refugio y servicios integrales para víctimas de violencia doméstica y abuso sexual.', contacto: '305-693-1170', sitio: 'www.thelodgemiami.org' },
    ],
  },
  Georgia: {
    legal: [
      { nombre: 'State Bar of Georgia – Find a Lawyer', desc: 'Directorio oficial para verificar abogados y localizar especialistas licenciados.', contacto: '404-527-8700', sitio: 'www.gabar.org' },
      { nombre: 'Atlanta Bar Association – Lawyer Referral', desc: 'Servicio de referencia para encontrar abogados por área jurídica en Metro Atlanta.', contacto: '404-521-0777', sitio: 'atlantabar.org' },
      { nombre: 'AILA Georgia-Alabama Chapter', desc: 'Directorio de abogados especializados en inmigración afiliados a AILA.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'Atlanta Legal Aid Society', desc: 'Ayuda civil gratuita para residentes elegibles de Metro Atlanta.', contacto: '404-524-5811', sitio: 'atlantalegalaid.org' },
      { nombre: 'Georgia Legal Services Program', desc: 'Ayuda civil gratuita para personas de bajos ingresos fuera de Metro Atlanta.', contacto: '888-408-1004', sitio: 'www.glsp.org' },
      { nombre: 'Georgia Free Legal Answers', desc: 'Consultas jurídicas civiles en línea para personas que cumplen requisitos.', contacto: null, sitio: 'ga.freelegalanswers.org' },
    ],
    violencia: [
      { nombre: 'Georgia Domestic Violence Hotline', desc: 'Línea estatal confidencial con conexión a refugios y programas locales.', contacto: '800-334-2836', sitio: 'gcadv.org' },
      { nombre: 'Partnership Against Domestic Violence', desc: 'Refugio, línea de crisis, vivienda transitoria y apoyo en Metro Atlanta.', contacto: '404-873-1766', sitio: 'padv.org' },
      { nombre: "International Women's House", desc: 'Servicios culturalmente sensibles para inmigrantes y refugiadas sobrevivientes.', contacto: '770-413-5557', sitio: 'internationalwomenshouse.org' },
    ],
  },
  'North Carolina': {
    legal: [
      { nombre: 'North Carolina Bar Association – Lawyer Referral Service', desc: 'Referencia a abogados licenciados por área de práctica.', contacto: '800-662-7660', sitio: 'www.ncbar.org/public-resources/find-an-nc-lawyer' },
      { nombre: 'North Carolina State Bar – Lawyer Search', desc: 'Verificación oficial de licencia y situación disciplinaria de abogados.', contacto: '919-828-4620', sitio: 'www.ncbar.gov/for-the-public/finding-a-lawyer' },
      { nombre: 'AILA Carolinas Chapter', desc: 'Directorio de abogados de inmigración miembros de AILA en las Carolinas.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'Legal Aid of North Carolina', desc: 'Ayuda civil gratuita en vivienda, seguridad familiar, ingresos y otros asuntos básicos.', contacto: '866-219-5262', sitio: 'legalaidnc.org' },
      { nombre: 'Charlotte Center for Legal Advocacy', desc: 'Servicios legales gratuitos para personas de bajos ingresos en el área de Charlotte.', contacto: '704-376-1600', sitio: 'charlottelegaladvocacy.org' },
      { nombre: 'NC Free Legal Answers', desc: 'Consultas civiles en línea respondidas por abogados voluntarios.', contacto: null, sitio: 'nc.freelegalanswers.org' },
    ],
    violencia: [
      { nombre: 'NC Coalition Against Domestic Violence', desc: 'Directorio estatal de programas y apoyo para sobrevivientes.', contacto: '919-956-9124', sitio: 'nccadv.org' },
      { nombre: 'Safe Alliance', desc: 'Línea de crisis, refugio y apoyo para violencia doméstica y sexual en Charlotte.', contacto: '980-771-4673', sitio: 'www.safealliance.org' },
      { nombre: 'InterAct of Wake County', desc: 'Refugio, crisis y servicios para violencia doméstica y sexual.', contacto: '919-828-7740', sitio: 'interactofwake.org' },
    ],
  },
  'South Carolina': {
    legal: [
      { nombre: 'South Carolina Bar – Lawyer Referral Service', desc: 'Referencia oficial a abogados licenciados por tipo de caso.', contacto: '800-868-2284', sitio: 'www.scbar.org/public/get-legal-help/find-lawyer-or-mediator' },
      { nombre: 'South Carolina Bar – Lawyer Directory', desc: 'Herramienta para verificar licencia y datos profesionales.', contacto: '803-799-6653', sitio: 'www.scbar.org' },
      { nombre: 'AILA Carolinas Chapter', desc: 'Directorio de abogados de inmigración miembros de AILA.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'South Carolina Legal Services', desc: 'Ayuda civil gratuita para residentes elegibles de bajos ingresos.', contacto: '888-346-5592', sitio: 'sclegal.org' },
      { nombre: 'Charleston Pro Bono Legal Services', desc: 'Ayuda civil gratuita para personas elegibles en el área de Charleston.', contacto: '843-853-6456', sitio: 'charlestonprobono.org' },
      { nombre: 'SC Free Legal Answers', desc: 'Consultas civiles en línea con abogados voluntarios.', contacto: null, sitio: 'sc.freelegalanswers.org' },
    ],
    violencia: [
      { nombre: 'SCCADVASA', desc: 'Coalición estatal y directorio de programas contra violencia doméstica y sexual.', contacto: '803-256-2900', sitio: 'www.sccadvasa.org' },
      { nombre: "My Sister's House", desc: 'Refugio y servicios para sobrevivientes en Charleston, Berkeley y Dorchester.', contacto: '843-744-3242', sitio: 'www.mysistershouse.org' },
      { nombre: 'Safe Harbor', desc: 'Refugio y apoyo para sobrevivientes en Upstate South Carolina.', contacto: '800-291-2139', sitio: 'www.safeharborsc.org' },
    ],
  },
  Tennessee: {
    legal: [
      { nombre: 'Tennessee Bar Association – Find Legal Help', desc: 'Recursos y referencias para localizar abogados y asistencia legal.', contacto: '615-383-7421', sitio: 'www.tba.org' },
      { nombre: 'Tennessee Board of Professional Responsibility', desc: 'Verificación oficial de licencia y estado disciplinario de abogados.', contacto: '800-486-5714', sitio: 'www.tbpr.org/for-the-public' },
      { nombre: 'AILA Mid-South Chapter', desc: 'Directorio de abogados especializados en inmigración en Tennessee y región.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'Legal Aid Society of Middle Tennessee and the Cumberlands', desc: 'Ayuda civil gratuita en vivienda, familia, empleo y beneficios.', contacto: '800-238-1443', sitio: 'las.org' },
      { nombre: 'Legal Aid of East Tennessee', desc: 'Ayuda civil gratuita para residentes elegibles del este de Tennessee.', contacto: '865-637-0484', sitio: 'www.laet.org' },
      { nombre: 'West Tennessee Legal Services', desc: 'Ayuda civil gratuita para personas elegibles en el oeste del estado.', contacto: '731-423-0616', sitio: 'wtls.org' },
    ],
    violencia: [
      { nombre: 'Tennessee Domestic Violence Hotline', desc: 'Línea estatal confidencial y conexión con refugios.', contacto: '800-356-6767', sitio: 'tncoalition.org' },
      { nombre: 'YWCA Nashville & Middle Tennessee', desc: 'Línea de crisis, refugio y apoyo para sobrevivientes.', contacto: '800-334-4628', sitio: 'www.ywcanashville.com' },
      { nombre: 'Nashville Office of Family Safety', desc: 'Centro coordinado para violencia doméstica, sexual y órdenes de protección.', contacto: '615-880-1100', sitio: 'ofs.nashville.gov' },
    ],
  },
  Boston: {
    legal: [
      { nombre: 'Massachusetts Bar Association – Lawyer Referral Service', desc: 'Referencia a abogados licenciados por especialidad y ubicación.', contacto: '617-654-0400', sitio: 'www.massbar.org/public/lawyer-referral-service' },
      { nombre: 'Boston Bar Association – Lawyer Referral Service', desc: 'Servicio de referencia para abogados en Boston y Greater Boston.', contacto: '617-742-0625', sitio: 'bostonbar.org' },
      { nombre: 'AILA New England Chapter', desc: 'Directorio de abogados de inmigración miembros de AILA en Nueva Inglaterra.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'Greater Boston Legal Services', desc: 'Ayuda civil gratuita en vivienda, empleo, familia, inmigración y beneficios.', contacto: '617-371-1234', sitio: 'www.gbls.org' },
      { nombre: 'Volunteer Lawyers Project', desc: 'Representación y asesoría civil gratuita para personas elegibles.', contacto: '617-603-1700', sitio: 'vlpnet.org' },
      { nombre: 'PAIR Project', desc: 'Asistencia legal migratoria gratuita para solicitantes de asilo y detenidos elegibles.', contacto: '617-742-9296', sitio: 'www.pairproject.org' },
    ],
    violencia: [
      { nombre: 'SafeLink Massachusetts', desc: 'Línea estatal 24/7 para violencia doméstica, refugio y planificación de seguridad.', contacto: '877-785-2020', sitio: 'www.mass.gov/info-details/massachusetts-safelink-resources' },
      { nombre: 'Casa Myrna', desc: 'Refugio, vivienda, línea de crisis y servicios para sobrevivientes en Boston.', contacto: '877-785-2020', sitio: 'casamyrna.org' },
      { nombre: 'The Network / La Red', desc: 'Servicios para sobrevivientes LGBTQ+, incluyendo apoyo bilingüe y vivienda.', contacto: '617-742-4911', sitio: 'www.tnlr.org' },
    ],
  },
  'Las Vegas': {
    legal: [
      { nombre: 'State Bar of Nevada – Lawyer Referral Service', desc: 'Referencia a abogados licenciados y búsqueda por área jurídica.', contacto: '702-382-0504', sitio: 'nvbar.org/for-the-public/find-a-lawyer' },
      { nombre: 'Clark County Bar Association – Lawyer Referral', desc: 'Servicio local para localizar abogados en Las Vegas y Clark County.', contacto: '702-387-6011', sitio: 'clarkcountybar.org' },
      { nombre: 'AILA Nevada Chapter', desc: 'Directorio de abogados de inmigración miembros de AILA.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'Legal Aid Center of Southern Nevada', desc: 'Servicios civiles gratuitos para residentes elegibles de Southern Nevada.', contacto: '702-386-1070', sitio: 'www.lacsn.org' },
      { nombre: 'Nevada Legal Services', desc: 'Ayuda civil gratuita en vivienda, beneficios, familia y otros asuntos.', contacto: '702-386-0404', sitio: 'nevadalegalservices.org' },
      { nombre: 'UNLV Immigration Clinic', desc: 'Representación migratoria gratuita en casos seleccionados mediante la clínica jurídica.', contacto: '702-895-2080', sitio: 'law.unlv.edu/clinics/immigration' },
    ],
    violencia: [
      { nombre: 'SafeNest', desc: 'Línea de crisis, refugio, asesoría y apoyo para violencia doméstica.', contacto: '702-646-4981', sitio: 'safenest.org' },
      { nombre: 'The Shade Tree', desc: 'Refugio y servicios para mujeres, niños y sobrevivientes de violencia.', contacto: '702-385-0072', sitio: 'theshadetree.org' },
      { nombre: 'Signs of HOPE', desc: 'Apoyo 24/7 para víctimas de violencia sexual, acompañamiento y defensa.', contacto: '702-366-1640', sitio: 'sohlv.org' },
    ],
  },
  Seattle: {
    legal: [
      { nombre: 'Washington State Bar Association – Find Legal Help', desc: 'Directorio y recursos oficiales para localizar abogados licenciados.', contacto: '800-945-9722', sitio: 'www.wsba.org/for-the-public/find-legal-help' },
      { nombre: 'King County Bar Association – Lawyer Referral', desc: 'Referencia a abogados y programas de asistencia legal en King County.', contacto: '206-267-7010', sitio: 'www.kcba.org/For-the-Public/Hire-a-Lawyer' },
      { nombre: 'AILA Washington Chapter', desc: 'Directorio de abogados de inmigración miembros de AILA.', contacto: null, sitio: 'www.aila.org' },
      { nombre: 'Northwest Justice Project', desc: 'Ayuda civil gratuita para personas elegibles en Washington.', contacto: '888-201-1014', sitio: 'nwjustice.org' },
      { nombre: 'King County Bar Association – Pro Bono Services', desc: 'Clínicas y programas gratuitos para residentes de bajos ingresos.', contacto: '206-267-7070', sitio: 'www.kcba.org/For-the-Public/Free-Legal-Assistance' },
      { nombre: 'Northwest Immigrant Rights Project', desc: 'Representación y servicios legales migratorios gratuitos o de bajo costo.', contacto: '206-587-4009', sitio: 'www.nwirp.org' },
    ],
    violencia: [
      { nombre: 'New Beginnings', desc: 'Línea de ayuda, refugio y apoyo para sobrevivientes de violencia doméstica.', contacto: '206-522-9472', sitio: 'newbegin.org' },
      { nombre: 'API Chaya', desc: 'Servicios culturalmente específicos para sobrevivientes de violencia doméstica, sexual y trata.', contacto: '206-325-0325', sitio: 'www.apichaya.org' },
      { nombre: 'Consejo Counseling & Referral Service', desc: 'Servicios bilingües para violencia doméstica, salud mental y comunidad latina.', contacto: '206-461-4880', sitio: 'consejocounseling.org' },
    ],
  },
};

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

// Un estado del selector (EstadoScreen.js) puede traer varios nombres juntos
// (ej. "Georgia · Mississippi · Alabama · Carolina") o abreviados (ej. "Carolinas").
// Por eso se buscan TODAS las regiones que calcen como substring, no solo una.
const ALIAS = {
  Florida: ['florida'],
  Georgia: ['georgia'],
  'North Carolina': ['north carolina'],
  'South Carolina': ['south carolina'],
  Tennessee: ['tennessee'],
  Boston: ['massachusetts', 'boston'],
  'Las Vegas': ['nevada', 'las vegas'],
  Seattle: ['washington', 'seattle'],
};

export function getRecursosPorEstado(estadoTexto, categoriaId) {
  const texto = normalizar(estadoTexto);
  if (!texto) return [];

  const regionesEncontradas = Object.keys(ALIAS).filter((region) =>
    ALIAS[region].some((alias) => texto.includes(alias))
  );

  // "Carolina" sin norte/sur (ej. selector combinado, o "Carolinas" en el modal de otros estados)
  // no distingue cuál — se muestran ambas.
  if (
    texto.includes('carolina') &&
    !regionesEncontradas.includes('North Carolina') &&
    !regionesEncontradas.includes('South Carolina')
  ) {
    regionesEncontradas.push('North Carolina', 'South Carolina');
  }

  return regionesEncontradas.flatMap((region) => {
    const recursos = RECURSOS[region]?.[categoriaId] || [];
    return recursos.map((r) => ({ ...r, region }));
  });
}
