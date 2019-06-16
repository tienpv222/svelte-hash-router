function checkRoutes (arr, ...args) {
  for (let e of args)
    cy.get(`.route:contains(${e})`).should('be.visible')

  for (let e of arr.filter(e => !args.includes(e)))
    cy.get(`.route:contains(${e})`).should('not.be.visible')
}

function checkProperty (key, value) {
  let prop = cy.get(`.property:contains(${key})`)
  if (value) prop.contains(value)
  else prop.should('not.be.visible')
}

it('root-routes', () => {
  let arr = [1, 2, 3]

  cy.visit('#/root-routes')
  checkRoutes(arr)

  for (let e of arr) {
    cy.contains(`/route${e}`).click()
    checkRoutes(arr, e)
  }
})

it('nested-routes', () => {
  let arr = [1, 2, 3, 4, 5, 6]

  cy.visit('#/nested-routes')
  checkRoutes(arr)

  cy.contains('/route1').click()
  checkRoutes(arr, 1)

  cy.contains('/route2').click()
  checkRoutes(arr, 1, 2)

  cy.contains('/route3').click()
  checkRoutes(arr, 1, 3)

  cy.contains('/route4').click()
  checkRoutes(arr, 4)

  cy.contains('/route5').click()
  checkRoutes(arr, 4, 5)

  cy.contains('/route6').click()
  checkRoutes(arr, 4, 5, 6)
})

it('wildcard', () => {
  let arr = [1, 2, 3]

  cy.visit('#/wildcard')
  checkRoutes(arr)

  cy.visit('#/wildcard/route1')
  checkRoutes(arr, 1)

  cy.visit('#/wildcard/route-whatever')
  checkRoutes(arr, 2)

  cy.visit('#/wildcard/whatever')
  checkRoutes(arr, 3)
})

it('optional', () => {
  let arr = [1, 2, 3]

  cy.visit('#/optional')
  checkRoutes(arr)

  cy.visit('#/optional/route')
  checkRoutes(arr, 1)

  cy.visit('#/optional/route1')
  checkRoutes(arr, 1)

  cy.visit('#/optional/route2')
  checkRoutes(arr, 2)

  cy.visit('#/optional/route-whatever')
  checkRoutes(arr, 3)
})

it('redirect', () => {
  let arr = [1, 2, 3]

  cy.visit('#/redirect')
  checkRoutes(arr)

  cy.visit('#/redirect/route4')
  checkRoutes(arr, 1)

  cy.visit('#/redirect/route5')
  checkRoutes(arr, 2)

  cy.visit('#/redirect-whatever')
  checkRoutes(arr, 3)
})

it('params', () => {
  let arr = [1, 2, 3]
  let checkProp = (id, name, wildcard) => {
    checkProperty('id', id)
    checkProperty('name', name)
    checkProperty('_', wildcard)
  }

  cy.visit('#/params')
  checkProp()
  checkRoutes(arr)

  cy.visit('#/params/id/name')
  checkProp()
  checkRoutes(arr, 1)

  cy.visit('#/params/123/name')
  checkProp(123)
  checkRoutes(arr, 2)

  cy.visit('#/params/123/John')
  checkProp(123, 'John')
  checkRoutes(arr, 3)

  cy.visit('#/params/123')
  checkProp(null, null, '/123')
  checkRoutes(arr, 4)
})

it('query', () => {
  let checkProp = (id, name) => {
    checkProperty('id', id)
    checkProperty('name', name)
    checkProperty('whatever')
  }

  cy.visit('#/query?')
  checkProp()

  cy.visit('#/query?id=1')
  checkProp(1)

  cy.visit('#/query?name=John')
  checkProp(null, 'John')

  cy.visit('#/query?id=1&name=John')
  checkProp(1, 'John')
})

it('active', () => {
  let arr = [1, 2, 3]

  cy.visit('#/active')
  checkProperty('href', '#/active')
  checkRoutes(arr)

  cy.visit('#/active/route1')
  checkProperty('href', '#/active/route1')
  checkRoutes(arr, 1)

  cy.visit('#/active/route2')
  checkProperty('href', '#/active/route2')
  checkRoutes(arr, 2)

  cy.visit('#/active/route2/route3')
  checkProperty('href', '#/active/route2/route3')
  checkRoutes(arr, 2, 3)
})
