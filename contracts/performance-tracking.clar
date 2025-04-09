;; Performance Tracking Contract
;; Monitors sales and customer satisfaction

(define-data-var admin principal tx-sender)

;; Data structure for tracking monthly performance
(define-map monthly-performance (tuple (franchisee principal) (year uint) (month uint))
  {
    sales: uint,
    customer-satisfaction: uint,
    transactions-count: uint,
    performance-score: uint
  }
)

;; Add sales data (can be called by franchisee or admin)
(define-public (report-sales (franchisee principal) (year uint) (month uint) (amount uint))
  (begin
    (asserts! (or (is-eq tx-sender franchisee) (is-eq tx-sender (var-get admin))) (err u1))
    (asserts! (and (> month u0) (<= month u12)) (err u2))

    (let ((current-data (default-to
                          {sales: u0, customer-satisfaction: u0, transactions-count: u0, performance-score: u0}
                          (map-get? monthly-performance {franchisee: franchisee, year: year, month: month}))))
      (map-set monthly-performance {franchisee: franchisee, year: year, month: month}
        (merge current-data {sales: (+ (get sales current-data) amount)})
      )
      (ok true)
    )
  )
)

;; Report customer satisfaction (1-10 scale)
(define-public (report-satisfaction (franchisee principal) (year uint) (month uint) (rating uint) (transactions uint))
  (begin
    (asserts! (or (is-eq tx-sender franchisee) (is-eq tx-sender (var-get admin))) (err u1))
    (asserts! (and (> month u0) (<= month u12)) (err u2))
    (asserts! (and (>= rating u1) (<= rating u10)) (err u3))

    (let ((current-data (default-to
                          {sales: u0, customer-satisfaction: u0, transactions-count: u0, performance-score: u0}
                          (map-get? monthly-performance {franchisee: franchisee, year: year, month: month}))))
      (map-set monthly-performance {franchisee: franchisee, year: year, month: month}
        (merge current-data
          {
            customer-satisfaction: rating,
            transactions-count: (+ (get transactions-count current-data) transactions)
          }
        )
      )
      (ok true)
    )
  )
)

;; Calculate performance score (admin only)
(define-public (calculate-performance-score (franchisee principal) (year uint) (month uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u1))
    (asserts! (and (> month u0) (<= month u12)) (err u2))

    (let ((current-data (default-to
                          {sales: u0, customer-satisfaction: u0, transactions-count: u0, performance-score: u0}
                          (map-get? monthly-performance {franchisee: franchisee, year: year, month: month}))))

      ;; Simple performance score calculation: (sales / 1000) + (satisfaction * 10)
      (let ((sales-factor (/ (get sales current-data) u1000))
            (satisfaction-factor (* (get customer-satisfaction current-data) u10)))

        (map-set monthly-performance {franchisee: franchisee, year: year, month: month}
          (merge current-data {performance-score: (+ sales-factor satisfaction-factor)})
        )
        (ok (+ sales-factor satisfaction-factor))
      )
    )
  )
)

;; Get performance data
(define-read-only (get-performance (franchisee principal) (year uint) (month uint))
  (map-get? monthly-performance {franchisee: franchisee, year: year, month: month})
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u1))
    (var-set admin new-admin)
    (ok true)
  )
)
