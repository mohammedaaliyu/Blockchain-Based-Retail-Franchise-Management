;; Franchisee Verification Contract
;; This contract validates qualified business operators

(define-data-var admin principal tx-sender)

;; Data map to store verified franchisees
(define-map franchisees principal
  {
    verified: bool,
    name: (string-utf8 100),
    business-id: (string-utf8 50),
    registration-date: uint
  }
)

;; Add a new franchisee
(define-public (register-franchisee (name (string-utf8 100)) (business-id (string-utf8 50)))
  (let ((caller tx-sender))
    (asserts! (not (default-to false (get verified (map-get? franchisees caller)))) (err u1))
    (ok (map-set franchisees caller
      {
        verified: false,
        name: name,
        business-id: business-id,
        registration-date: block-height
      }
    ))
  )
)

;; Verify a franchisee (admin only)
(define-public (verify-franchisee (franchisee principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u2))
    (asserts! (is-some (map-get? franchisees franchisee)) (err u3))
    (ok (map-set franchisees franchisee
      (merge (unwrap-panic (map-get? franchisees franchisee)) {verified: true})
    ))
  )
)

;; Revoke a franchisee's verification (admin only)
(define-public (revoke-franchisee (franchisee principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u2))
    (asserts! (is-some (map-get? franchisees franchisee)) (err u3))
    (ok (map-set franchisees franchisee
      (merge (unwrap-panic (map-get? franchisees franchisee)) {verified: false})
    ))
  )
)

;; Check if a principal is a verified franchisee
(define-read-only (is-verified-franchisee (franchisee principal))
  (default-to false (get verified (map-get? franchisees franchisee)))
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u2))
    (var-set admin new-admin)
    (ok true)
  )
)
