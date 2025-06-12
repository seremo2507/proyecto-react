Feature: Pruebas de aceptación de la app

  Scenario: Login exitoso
    Given la app está abierta
    When ingreso el email "test@example.com"
    And ingreso la contraseña "password123"
    And presiono el botón "Iniciar Sesión"
    Then debería ver "Inicio de sesión exitoso"

  Scenario: Crear envío
    Given la app está abierta
    When navego a "Crear Envío"
    And ingreso el origen "Ciudad de México"
    And ingreso el destino "Guadalajara"
    And presiono el botón "Crear Envío"
    Then debería ver "Envío creado"

  Scenario: Navegación entre pantallas
    Given la app está abierta
    When abro el menú
    And navego a "Crear Envío"
    Then debería ver "Crear Envío"
    When abro el menú
    And navego a "Inicio"
    Then debería ver "Envíos" 