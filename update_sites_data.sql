-- Update existing sites with Coffee Cup Travel Plaza data
UPDATE app.Sites SET 
    name = N'Vermillion',
    store_id = 1006,
    form_title = N'Coffee Cup Travel Plaza - Burbank',
    street = NULL,
    city = N'Burbank',
    state = N'SD',
    zip = N'57010',
    phone = N'6056242062',
    street_l = N'47051 SD-50',
    pdi_name = N'Vermillion',
    email = N'store1006@heinzcorps.com',
    caribou_id = N'8204',
    fuel_dispensers = 1,
    tz = N'America/Chicago'
WHERE site_id = 1006;

-- Insert new sites if they don't exist
IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 1)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz)
VALUES (1, N'Vermillion', 1006, N'Coffee Cup Travel Plaza - Burbank', NULL, N'Burbank', N'SD', N'57010', N'6056242062', N'47051 SD-50', N'Vermillion', N'store1006@heinzcorps.com', N'8204', 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 2)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz)
VALUES (2, N'Steele', 1002, N'Coffee Cup Travel Plaza - Steele', NULL, N'Steele', N'ND', N'58482', N'7014752274', N'620 Mitchell Ave N', N'Steele', N'store1002@heinzcorps.com', N'8427', 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 3)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz)
VALUES (3, N'Summit', 1001, N'Coffee Cup Travel Plaza - Summit', N'45789 US-12', N'Summit', N'SD', N'57266', N'6053986493', N'45789 US-12', N'Summit', N'store1001@heinzcorps.com', N'8299', 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 4)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz)
VALUES (4, N'SummitShop', 1021, N'TA Truck Service Center - Summit SD', NULL, N'Summit', N'SD', N'57266', NULL, N'45789 US-12', N'Summit Shop', N'shop1021@heinzcorps.com', NULL, 0, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 5)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz)
VALUES (5, N'Hot Springs', 1009, N'Coffee Cup Travel Plaza - Hot Springs', NULL, N'Hot Springs', N'SD', N'57747', N'6057454215', N'27638 US-385', N'Hot Springs', N'store1009@heinzcorps.com', NULL, 1, N'America/Denver');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 6)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz)
VALUES (6, N'Corporate', 1000, N'Coffee Cup Travel Plaza - Corporate Office', NULL, N'Sioux Falls', N'SD', N'57106', N'6052742540', N'2508 S Carolyn Ave', N'HH Admin', N'bbeeken@heinzcorps.com', NULL, 0, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 7)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz)
VALUES (7, N'Heinz Retail Estate', 2000, N'Heinz Real Estate', NULL, N'Sioux Falls', N'SD', N'57106', N'6052742540', N'2508 S Carolyn Ave', N'HRE', N'hre@heinzcorps.com', NULL, 0, N'America/Chicago');
