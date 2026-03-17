describe('Seguridad de Datos - Ventas con Login', () => {
  
  // Este bloque se ejecuta antes de cada test
  beforeEach(() => {
    // 1. Ir a la página de login
    cy.visit('http://localhost:5173/login'); // Ajustá si tu ruta de login es distinta

    // 2. Loguearse (Ajustá los selectores si tus inputs no usan 'name')
    // Si falla aquí, probá con cy.get('#email') o cy.get('input[type="email"]')
    cy.get('input[name="email"]').type('egallego@hotmail.com'); 
    cy.get('input[name="password"]').type('123456'); // <--- PONÉ TU PASS ACÁ
    
    // 3. Hacer clic en entrar
    cy.get('button[type="submit"]').click();

    // 4. Verificar que entramos (esperamos a ver algo del dashboard o la URL)
    cy.url().should('include', '/dashboard'); 
  });

  it('Debería navegar a ventas y verificar que los pasajeros están vivos', () => {
    // 1. Ir directamente a la página de ventas
    cy.visit('http://localhost:5173/sales');

    // 2. Esperar a que el Backend traiga los datos
    cy.wait(3000); 

    // 3. LA PRUEBA DE ORO: Buscar a Gerardo
    // Si el nombre no aparece, el robot sacará una captura del error
    cy.contains('juan goicoa', { timeout: 10000 }).should('be.visible');

    // 4. Verificación extra: que la tabla tenga datos
    cy.get('table').should('exist');
    cy.get('table tr').should('have.length.at.least', 2);
    
    cy.log('¡Confirmado! Los nombres de los pasajeros siguen en la base de datos.');
  });
});