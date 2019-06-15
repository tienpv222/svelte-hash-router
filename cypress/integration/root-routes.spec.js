function checkVisibility (arr, ...args) {
  for (let e of args)
    cy.get(`.route:contains(${e})`).should('be.visible')

  for (let e of arr.filter(e => !args.includes(e)))
    cy.get(`.route:contains(${e})`).should('not.be.visible')
}

describe('schema', () => {
  it('root-routes', () => {
    let arr = [1, 2, 3]

    cy.visit('#/root-routes')

    for (let e of arr) {
      cy.contains(`/route${e}`).click()
      checkVisibility(arr, e)
    }
  })

  it('nested-routes', () => {
    let arr = [1, 2, 3, 4, 5, 6]

    cy.visit('#/nested-routes')

    cy.contains('/route1').click()
    checkVisibility(arr, 1)

    cy.contains('/route2').click()
    checkVisibility(arr, 1, 2)

    cy.contains('/route3').click()
    checkVisibility(arr, 1, 3)

    cy.contains('/route4').click()
    checkVisibility(arr, 4)

    cy.contains('/route5').click()
    checkVisibility(arr, 4, 5)

    cy.contains('/route6').click()
    checkVisibility(arr, 4, 5, 6)
  })
})
