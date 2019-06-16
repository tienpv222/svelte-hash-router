function checkVisible (name, arr, ...args) {
  for (let e of args)
    cy.get(`.${name}:contains(${e})`).should('be.visible')

  for (let e of arr.filter(e => !args.includes(e)))
    cy.get(`.${name}:contains(${e})`).should('not.be.visible')
}

function checkRoutes () {
  checkVisible('route', ...arguments)
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

it('without-component', () => {
  let arr = [1, 2, 3]

  cy.visit('#/without-component')
  checkRoutes(arr)

  cy.contains('/route1').click()
  checkRoutes(arr)

  cy.contains('/route2').click()
  checkRoutes(arr, 2)

  cy.contains('/route3').click()
  checkRoutes(arr, 3)
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

it('matches', () => {
  let checkProp = (...args) => checkVisible('property', ...args)
  let arr = ['/', 'matches', '/route1', '/route2', '/route3']

  cy.visit('#/matches')
  checkProp(arr, '/', 'matches')

  cy.visit('#/matches/route1')
  checkProp(arr, '/', 'matches', '/route1')

  cy.visit('#/matches/route2')
  checkProp(arr, '/', 'matches', '/route2')

  cy.visit('#/matches/route2/route3')
  checkProp(arr, '/', 'matches', '/route2', '/route3')
})

it('stringify', () => {
  cy.visit('#/stringify')

  cy.get('button:contains(123)').click()
  cy.get('.property').should('contain', 'John')

  cy.get('button:contains(456)').click()
  cy.get('.property').should('contain', 'Anne')

  cy.get('button:contains(789)').click()
  cy.get('.property').should('contain', 'Rose')
})

it('freeze-routes', () => {
  cy.visit('#/freeze-routes')

  cy.get('.catch').should('contain', 'TypeError')
  cy.get('.pathname').should('contain', 'freeze-routes')
})
