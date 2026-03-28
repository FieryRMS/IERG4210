# pyright: reportUnusedImport=false, reportArgumentType=false
"""devdata

Revision ID: e2f5707f9f22
Revises: 5140acdf3025
Create Date: 2026-03-26 11:16:20.986484+00:00

"""
import uuid
from collections.abc import Sequence
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
import sqlmodel
import sqlmodel.sql.sqltypes
import random

rnd = random.Random()
rnd.seed(123)

def UUID() -> uuid.UUID:
    return uuid.UUID(int=rnd.getrandbits(128), version=4)

# revision identifiers, used by Alembic.
revision: str = 'e2f5707f9f22'
down_revision: str | Sequence[str] | None = '5140acdf3025'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Fixed UUIDs so downgrade can delete exact rows
CAT_ELECTRONICS = UUID()
CAT_BOOKS       = UUID()
CAT_CLOTHING    = UUID()

PROD_SMARTPHONE = UUID()
PROD_LAPTOP     = UUID()
PROD_NOVEL      = UUID()
PROD_TEXTBOOK   = UUID()
PROD_TSHIRT     = UUID()
PROD_JEANS      = UUID()

IMG_SMARTPHONE_FRONT = UUID()
IMG_SMARTPHONE_BACK  = UUID()
IMG_SMARTPHONE_SIDE  = UUID()
IMG_LAPTOP_FRONT     = UUID()
IMG_LAPTOP_SIDE      = UUID()
IMG_NOVEL            = UUID()
IMG_TEXTBOOK         = UUID()
IMG_TSHIRT_FRONT     = UUID()
IMG_TSHIRT_BACK      = UUID()
IMG_JEANS_FRONT      = UUID()
IMG_JEANS_BACK       = UUID()

LINK_IDS = [uuid.UUID(f'd4000000-0000-0000-0000-{i:012d}') for i in range(1, 12)]


def upgrade() -> None:
    """Upgrade schema."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    categories_table = sa.table('categories',
        sa.column('id', sa.Uuid()),
        sa.column('created_at', sa.DateTime()),
        sa.column('updated_at', sa.DateTime()),
        sa.column('name', sa.String()),
        sa.column('description', sa.String()),
    )
    op.bulk_insert(categories_table, [
        {'id': CAT_ELECTRONICS, 'created_at': now, 'updated_at': now, 'name': 'Electronics', 'description': 'Devices and gadgets'},
        {'id': CAT_BOOKS,       'created_at': now, 'updated_at': now, 'name': 'Books',       'description': 'Printed and digital books'},
        {'id': CAT_CLOTHING,    'created_at': now, 'updated_at': now, 'name': 'Clothing',    'description': 'Apparel and accessories'},
    ])

    products_table = sa.table('products',
        sa.column('id', sa.Uuid()),
        sa.column('created_at', sa.DateTime()),
        sa.column('updated_at', sa.DateTime()),
        sa.column('catid', sa.Uuid()),
        sa.column('name', sa.String()),
        sa.column('price', sa.Float()),
        sa.column('description', sa.String()),
    )
    op.bulk_insert(products_table, [
        {'id': PROD_SMARTPHONE, 'created_at': now, 'updated_at': now, 'catid': CAT_ELECTRONICS, 'name': 'Smartphone', 'price': 699.99,  'description': 'Latest model smartphone with advanced features'},
        {'id': PROD_LAPTOP,     'created_at': now, 'updated_at': now, 'catid': CAT_ELECTRONICS, 'name': 'Laptop',     'price': 1299.99, 'description': 'High-performance laptop for work and gaming'},
        {'id': PROD_NOVEL,      'created_at': now, 'updated_at': now, 'catid': CAT_BOOKS,       'name': 'Novel',      'price': 19.99,   'description': 'Bestselling fiction novel'},
        {'id': PROD_TEXTBOOK,   'created_at': now, 'updated_at': now, 'catid': CAT_BOOKS,       'name': 'Textbook',   'price': 89.99,   'description': 'Comprehensive textbook for students'},
        {'id': PROD_TSHIRT,     'created_at': now, 'updated_at': now, 'catid': CAT_CLOTHING,    'name': 'T-shirt',    'price': 12.99,   'description': 'Comfortable cotton t-shirt'},
        {'id': PROD_JEANS,      'created_at': now, 'updated_at': now, 'catid': CAT_CLOTHING,    'name': 'Jeans',      'price': 49.99,   'description': 'Stylish denim jeans'},
    ])

    images_table = sa.table('images',
        sa.column('id', sa.Uuid()),
        sa.column('created_at', sa.DateTime()),
        sa.column('updated_at', sa.DateTime()),
        sa.column('url', sa.String()),
        sa.column('alt', sa.String()),
    )
    op.bulk_insert(images_table, [
        {'id': IMG_SMARTPHONE_FRONT, 'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/smartphone.png',      'alt': 'Smartphone front view'},
        {'id': IMG_SMARTPHONE_BACK,  'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/smartphone-back.png', 'alt': 'Smartphone back view'},
        {'id': IMG_SMARTPHONE_SIDE,  'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/smartphone-side.png', 'alt': 'Smartphone side view'},
        {'id': IMG_LAPTOP_FRONT,     'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/laptop.png',          'alt': 'Laptop front view'},
        {'id': IMG_LAPTOP_SIDE,      'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/laptop-side.png',     'alt': 'Laptop side view'},
        {'id': IMG_NOVEL,            'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/novel.png',           'alt': 'Novel cover'},
        {'id': IMG_TEXTBOOK,         'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/textbook.png',        'alt': 'Textbook cover'},
        {'id': IMG_TSHIRT_FRONT,     'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/tshirt.png',          'alt': 'T-shirt front view'},
        {'id': IMG_TSHIRT_BACK,      'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/tshirt-back.png',     'alt': 'T-shirt back view'},
        {'id': IMG_JEANS_FRONT,      'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/jeans.png',           'alt': 'Jeans front view'},
        {'id': IMG_JEANS_BACK,       'created_at': now, 'updated_at': now, 'url': 'https://avatar.vercel.sh/jeans-back.png',      'alt': 'Jeans back view'},
    ])

    links_table = sa.table('imageproductlink',
        sa.column('id', sa.Uuid()),
        sa.column('created_at', sa.DateTime()),
        sa.column('updated_at', sa.DateTime()),
        sa.column('image_id', sa.Uuid()),
        sa.column('product_id', sa.Uuid()),
    )
    op.bulk_insert(links_table, [
        {'id': LINK_IDS[0],  'created_at': now, 'updated_at': now, 'image_id': IMG_SMARTPHONE_FRONT, 'product_id': PROD_SMARTPHONE},
        {'id': LINK_IDS[1],  'created_at': now, 'updated_at': now, 'image_id': IMG_SMARTPHONE_BACK,  'product_id': PROD_SMARTPHONE},
        {'id': LINK_IDS[2],  'created_at': now, 'updated_at': now, 'image_id': IMG_SMARTPHONE_SIDE,  'product_id': PROD_SMARTPHONE},
        {'id': LINK_IDS[3],  'created_at': now, 'updated_at': now, 'image_id': IMG_LAPTOP_FRONT,     'product_id': PROD_LAPTOP},
        {'id': LINK_IDS[4],  'created_at': now, 'updated_at': now, 'image_id': IMG_LAPTOP_SIDE,      'product_id': PROD_LAPTOP},
        {'id': LINK_IDS[5],  'created_at': now, 'updated_at': now, 'image_id': IMG_NOVEL,            'product_id': PROD_NOVEL},
        {'id': LINK_IDS[6],  'created_at': now, 'updated_at': now, 'image_id': IMG_TEXTBOOK,         'product_id': PROD_TEXTBOOK},
        {'id': LINK_IDS[7],  'created_at': now, 'updated_at': now, 'image_id': IMG_TSHIRT_FRONT,     'product_id': PROD_TSHIRT},
        {'id': LINK_IDS[8],  'created_at': now, 'updated_at': now, 'image_id': IMG_TSHIRT_BACK,      'product_id': PROD_TSHIRT},
        {'id': LINK_IDS[9],  'created_at': now, 'updated_at': now, 'image_id': IMG_JEANS_FRONT,      'product_id': PROD_JEANS},
        {'id': LINK_IDS[10], 'created_at': now, 'updated_at': now, 'image_id': IMG_JEANS_BACK,       'product_id': PROD_JEANS},
    ])


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM imageproductlink WHERE id IN :ids"), {'ids': tuple(str(i) for i in LINK_IDS)})
    conn.execute(sa.text("DELETE FROM images      WHERE id IN :ids"), {'ids': tuple(str(i) for i in [IMG_SMARTPHONE_FRONT, IMG_SMARTPHONE_BACK, IMG_SMARTPHONE_SIDE, IMG_LAPTOP_FRONT, IMG_LAPTOP_SIDE, IMG_NOVEL, IMG_TEXTBOOK, IMG_TSHIRT_FRONT, IMG_TSHIRT_BACK, IMG_JEANS_FRONT, IMG_JEANS_BACK])})
    conn.execute(sa.text("DELETE FROM products    WHERE id IN :ids"), {'ids': tuple(str(i) for i in [PROD_SMARTPHONE, PROD_LAPTOP, PROD_NOVEL, PROD_TEXTBOOK, PROD_TSHIRT, PROD_JEANS])})
    conn.execute(sa.text("DELETE FROM categories  WHERE id IN :ids"), {'ids': tuple(str(i) for i in [CAT_ELECTRONICS, CAT_BOOKS, CAT_CLOTHING])})
