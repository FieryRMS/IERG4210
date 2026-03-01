CREATE TABLE categories (
    catid SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR
);

INSERT INTO categories (name, description)
VALUES ('Electronics', 'Devices and gadgets'),
    ('Books', 'Printed and digital books'),
    ('Clothing', 'Apparel and accessories');


CREATE TABLE products (
    pid SERIAL PRIMARY KEY,
    catid INT NOT NULL REFERENCES categories(catid),
    name VARCHAR NOT NULL,
    price DECIMAL NOT NULL,
    description VARCHAR
);
INSERT INTO products (catid, name, price, description)
VALUES (
        1,
        'Smartphone',
        699.99,
        'Latest model smartphone with advanced
    features'
    ),
    (
        1,
        'Laptop',
        1299.99,
        'High-performance laptop for work and gaming'
    ),
    (2, 'Novel', 19.99, 'Bestselling fiction novel'),
    (
        2,
        'Textbook',
        89.99,
        'Comprehensive textbook for students'
    ),
    (
        3,
        'T-shirt',
        14.99,
        'Comfortable cotton t-shirt'
    ),
    (3, 'Jeans', 49.99, 'Stylish denim jeans');