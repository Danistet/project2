/* ========================================================== */
/* LOCAL MOCK DB START                                        */
/* Временное решение: вместо backend/Firebird данные берутся  */
/* из локальных переменных.                                   */
/* ========================================================== */

(() => {
  // true = работаем из локальных переменных
  // false = обычный режим через сервер
  const USE_LOCAL_DB = false;
  const LOCAL_MOCK_PERSIST = true;
  const LOCAL_DB_KEY = 'LOCAL_MOCK_DB_V4S';
  if (!USE_LOCAL_DB) {
    return;
  }
  /* ========================================================== */
  /*                                */
  /* ========================================================== */
  const LOCAL_DB_SEED = {
    CONTROLLERS: [
      {
        ID: 112,
        PHONE: '89000000000',
        CONTROLLER_PSWD: '1234',
        TOKEN: 'LOCAL_TOKEN_112',
        AUTHDATE: 0,
        FIO: 'Контролер1234'
      },
      {
        ID: 91,
        PHONE: '78888888888',
        CONTROLLER_PSWD: 'qwerty',
        TOKEN: 'LOCAL_TOKEN_91',
        AUTHDATE: 0,
        FIO: 'Контролерqwerty'
      }
    ],

    SERVICES: [
      {
        ID: 556,
        NAME: 'ХВС (3,887) МКД и общ. с ГВС, центр. канал., ванны до 1550',
        GROUP_ID: 556,
        CALCTYPE: '0',
        UNIT: 'м3',
        CREATEDATE: '13.05.2026',
        SHORT_NAME: 'ХВС',
        GROUP_NAME: 'Холодное водоснабжение'
      },
      {
        ID: 561,
        NAME: 'Отопление',
        GROUP_ID: 537,
        CALCTYPE: '1',
        UNIT: 'Гкал',
        CREATEDATE: '13.05.2026',
        SHORT_NAME: 'Отопление',
        GROUP_NAME: 'Отопление'
      },
      {
        ID: 598,
        NAME: 'ХВС на ГВС (3,461) МКД с ГВС, центр. канал., ванны до 1700',
        GROUP_ID: 597,
        CALCTYPE: '0',
        UNIT: 'м3',
        CREATEDATE: '13.05.2026',
        SHORT_NAME: 'ХВС на ГВС',
        GROUP_NAME: 'ХВС на ГВС'
      }
    ],

    METERS: [
      {
        ID: 1,
        METER_NUM: '45697854',
        CONTROLER_ID: 91,
        METER_TYPE: 234,
        STATUS: 1,
        VERIFY_DATE: '2026-09-01',
        SEAL: '04434233',
        MANFDATE: '2020-01-01',
        NAME: 'с\узел',
        LS: '110067865',
        METER_STATUS: '1',
        BDATE: '2019-11-27',
        MOUNT_DATE: '2020-02-01',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 2,
        METER_NUM: '45697855',
        CONTROLER_ID: 112,
        METER_TYPE: 144,
        STATUS: 1,
        VERIFY_DATE: '2026-08-31',
        SEAL: '03343466532',
        MANFDATE: '2018-01-01',
        NAME: 'с\узел',
        LS: '110067866',
        METER_STATUS: '1',
        BDATE: '2019-11-27',
        MOUNT_DATE: '2020-03-01',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 3,
        METER_NUM: '45798786',
        CONTROLER_ID: 91,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-31',
        SEAL: '073847238',
        MANFDATE: '2018-02-02',
        NAME: 'ванная комната',
        LS: '110049532',
        METER_STATUS: '1',
        BDATE: '2018-11-27',
        MOUNT_DATE: '2020-03-01',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 4,
        METER_NUM: '45982471',
        CONTROLER_ID: 112,
        METER_TYPE: 234,
        STATUS: 1,
        VERIFY_DATE: '2026-08-06',
        SEAL: '',
        MANFDATE: '2019-12-02',
        NAME: '',
        LS: '1100564760',
        METER_STATUS: '1',
        BDATE: '2019-11-20',
        MOUNT_DATE: '2020-03-21',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 5,
        METER_NUM: '45872347',
        CONTROLER_ID: 91,
        METER_TYPE: 144,
        STATUS: 1,
        VERIFY_DATE: '2026-08-06',
        SEAL: '06743436',
        MANFDATE: '2019-05-02',
        NAME: 'коридор',
        LS: '110067867',
        METER_STATUS: '1',
        BDATE: '2019-05-02',
        MOUNT_DATE: '2020-03-21',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 6,
        METER_NUM: '45789754',
        CONTROLER_ID: 112,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-06',
        SEAL: '01292934',
        MANFDATE: '2019-06-02',
        NAME: 'коридор',
        LS: '110178453',
        METER_STATUS: '1',
        BDATE: '2019-05-02',
        MOUNT_DATE: '2020-03-22',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 7,
        METER_NUM: '45788235',
        CONTROLER_ID: 91,
        METER_TYPE: 234,
        STATUS: 1,
        VERIFY_DATE: '2026-08-06',
        SEAL: '04723478',
        MANFDATE: '2019-07-02',
        NAME: 'ванна',
        LS: '110898989',
        METER_STATUS: '1',
        BDATE: '2019-07-02',
        MOUNT_DATE: '2020-03-22',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 8,
        METER_NUM: '46763423',
        CONTROLER_ID: 112,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-06',
        SEAL: '43435345',
        MANFDATE: '2019-08-02',
        NAME: 'ванна',
        LS: '110273737',
        METER_STATUS: '1',
        BDATE: '2019-08-02',
        MOUNT_DATE: '2020-04-22',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 9,
        METER_NUM: '46234324',
        CONTROLER_ID: 91,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-06',
        SEAL: '01232145',
        MANFDATE: '2019-09-02',
        NAME: 'ванна',
        LS: '116723622',
        METER_STATUS: '1',
        BDATE: '2019-09-02',
        MOUNT_DATE: '2020-04-23',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 10,
        METER_NUM: '46746476',
        CONTROLER_ID: 112,
        METER_TYPE: 144,
        STATUS: 1,
        VERIFY_DATE: '2026-08-06',
        SEAL: '03213123',
        MANFDATE: '2019-01-02',
        NAME: 'с/узел',
        LS: '116578657',
        METER_STATUS: '1',
        BDATE: '2019-01-02',
        MOUNT_DATE: '2020-01-23',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 11,
        METER_NUM: '45328894',
        CONTROLER_ID: 91,
        METER_TYPE: 144,
        STATUS: 1,
        VERIFY_DATE: '2026-08-07',
        SEAL: '04354555',
        MANFDATE: '2019-01-02',
        NAME: 'ванна',
        LS: '114534657',
        METER_STATUS: '1',
        BDATE: '2019-02-03',
        MOUNT_DATE: '2020-01-13',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 12,
        METER_NUM: '45787878',
        CONTROLER_ID: 112,
        METER_TYPE: 144,
        STATUS: 1,
        VERIFY_DATE: '2026-08-07',
        SEAL: '07653423',
        MANFDATE: '2019-01-02',
        NAME: 'ванна',
        LS: '110000043',
        METER_STATUS: '1',
        BDATE: '2019-02-03',
        MOUNT_DATE: '2020-01-13',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 13,
        METER_NUM: '423432423',
        CONTROLER_ID: 91,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-07',
        SEAL: '32432342',
        MANFDATE: '2019-01-02',
        NAME: 'ванная комната',
        LS: '110056476',
        METER_STATUS: '1',
        BDATE: '2019-01-03',
        MOUNT_DATE: '2020-01-03',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 14,
        METER_NUM: '44385964',
        CONTROLER_ID: 112,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-07',
        SEAL: '073577323',
        MANFDATE: '2019-01-02',
        NAME: 'ванная комната',
        LS: '110001345',
        METER_STATUS: '1',
        BDATE: '2019-01-03',
        MOUNT_DATE: '2020-01-03',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 15,
        METER_NUM: '45141414',
        CONTROLER_ID: 91,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-07',
        SEAL: '02342345',
        MANFDATE: '2019-01-02',
        NAME: 'ванная комната',
        LS: '110001414',
        METER_STATUS: '1',
        BDATE: '2019-01-03',
        MOUNT_DATE: '2020-01-13',
        CREATEDATE: '2026-02-12'
      },
      {
        ID: 16,
        METER_NUM: '45899889',
        CONTROLER_ID: 112,
        METER_TYPE: 343,
        STATUS: 1,
        VERIFY_DATE: '2026-08-07',
        SEAL: '03437451',
        MANFDATE: '2019-01-02',
        NAME: 'ванная комната',
        LS: '110049532',
        METER_STATUS: '1',
        BDATE: '2019-01-03',
        MOUNT_DATE: '2020-01-13',
        CREATEDATE: '2026-02-12'
      }
    ],

    METERS_IND: [
      {
        ID: 1,
        METER_ID: '45798786',
        ACT_ID: 1,
        PH: 450.000,
        CREATEDATE: '2026-08-01 10:00:00',
        IS_DELETED: 0
      },
      {
        ID: 2,
        METER_ID: '44385964',
        ACT_ID: 2,
        PH: 540.000,
        CREATEDATE: '2026-08-01 10:00:00',
        IS_DELETED: 0
      },
    ],

    ABONENTS: [
      {
        ID: 1,
        BUILDINGS_ID: 1,
        CLIENT_ID: 1,
        APPARTS: '375',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110049532'
      },
      {
        ID: 2,
        BUILDINGS_ID: 1,
        CLIENT_ID: 2,
        APPARTS: '376',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110067865'
      },
      {
        ID: 3,
        BUILDINGS_ID: 1,
        CLIENT_ID: 3,
        APPARTS: '377',
        LETTER: '1',
        IS_ACTIVE: 1,
        G_LICSCHET: '110067866'
      },
      {
        ID: 4,
        BUILDINGS_ID: 1,
        CLIENT_ID: 4,
        APPARTS: '377',
        LETTER: '2',
        IS_ACTIVE: 1,
        G_LICSCHET: '110067867'
      },
      {
        ID: 5,
        BUILDINGS_ID: 10,
        CLIENT_ID: 5,
        APPARTS: '377',
        LETTER: '2',
        IS_ACTIVE: 1,
        G_LICSCHET: '110056476'
      },
      {
        ID: 6,
        BUILDINGS_ID: 11,
        CLIENT_ID: 6,
        APPARTS: '6',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110178453'
      },
      {
        ID: 7,
        BUILDINGS_ID: 12,
        CLIENT_ID: 7,
        APPARTS: '1',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110898989'
      },
      {
        ID: 8,
        BUILDINGS_ID: 23,
        CLIENT_ID: 8,
        APPARTS: '81',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110273737'
      },
      {
        ID: 9,
        BUILDINGS_ID: 24,
        CLIENT_ID: 9,
        APPARTS: '',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '116723622'
      },
      {
        ID: 10,
        BUILDINGS_ID: 19,
        CLIENT_ID: 10,
        APPARTS: '45',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '116578657'
      },
      {
        ID: 11,
        BUILDINGS_ID: 7,
        CLIENT_ID: 11,
        APPARTS: '31',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '114534657'
      },
      {
        ID: 12,
        BUILDINGS_ID: 23,
        CLIENT_ID: 12,
        APPARTS: '',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110000043'
      },
      {
        ID: 13,
        BUILDINGS_ID: 15,
        CLIENT_ID: 13,
        APPARTS: '13',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110001345'
      },
      {
        ID: 14,
        BUILDINGS_ID: 14,
        CLIENT_ID: 14,
        APPARTS: '14',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '110001414'
      },
      {
        ID: 15,
        BUILDINGS_ID: 10,
        CLIENT_ID: 15,
        APPARTS: '7',
        LETTER: '',
        IS_ACTIVE: 1,
        G_LICSCHET: '1100564760'
      }
    ],

    BUILDINGS: [
      {
        ID: 1,
        STREET_ID: 1,
        HOUSE: '10',
        CORPS: ''
      },
      {
        ID: 2,
        STREET_ID: 1,
        HOUSE: '9',
        CORPS: ''
      },
      {
        ID: 3,
        STREET_ID: 1,
        HOUSE: '7/3',
        CORPS: ''
      },
      {
        ID: 4,
        STREET_ID: 2,
        HOUSE: '4/5',
        CORPS: ''
      },
      {
        ID: 5,
        STREET_ID: 2,
        HOUSE: '4/6',
        CORPS: ''
      },
      {
        ID: 6,
        STREET_ID: 2,
        HOUSE: '4/7',
        CORPS: ''
      },
      {
        ID: 7,
        STREET_ID: 3,
        HOUSE: '31',
        CORPS: ''
      },
      {
        ID: 8,
        STREET_ID: 3,
        HOUSE: '30',
        CORPS: ''
      }, 
      {
        ID: 9,
        STREET_ID: 3,
        HOUSE: '2',
        CORPS: ''
      },  
      {
        ID: 10,
        STREET_ID: 4,
        HOUSE: '10',
        CORPS: ''
      }, 
      {
        ID: 11,
        STREET_ID: 4,
        HOUSE: '15',
        CORPS: ''
      },
      {
        ID: 12,
        STREET_ID: 4,
        HOUSE: '23',
        CORPS: ''
      },
      {
        ID: 13,
        STREET_ID: 11,
        HOUSE: '5/5',
        CORPS: ''
      },
      {
        ID: 14,
        STREET_ID: 5,
        HOUSE: '5/7',
        CORPS: ''
      },
      {
        ID: 15,
        STREET_ID: 6,
        HOUSE: '1',
        CORPS: ''
      },
      {
        ID: 17,
        STREET_ID: 20,
        HOUSE: '10',
        CORPS: ''
      },
      {
        ID: 18,
        STREET_ID: 6,
        HOUSE: '9',
        CORPS: ''
      },
      {
        ID: 19,
        STREET_ID: 7,
        HOUSE: '19',
        CORPS: ''
      },
      {
        ID: 20,
        STREET_ID: 7,
        HOUSE: '22',
        CORPS: ''
      },
      {
        ID: 21,
        STREET_ID: 8,
        HOUSE: '1/1',
        CORPS: ''
      },
      {
        ID: 22,
        STREET_ID: 9,
        HOUSE: '12',
        CORPS: '2'
      },
      {
        ID: 23,
        STREET_ID: 10,
        HOUSE: '81',
        CORPS: ''
      },
      {
        ID: 24,
        STREET_ID: 12,
        HOUSE: '43',
        CORPS: ''
      }
    ],

    RSTREETS: [
      {
        ID: 1,
        STREET: 'РЕЧНАЯ',
        CODE: '2',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'ул.'
      },
      {
        ID: 2,
        STREET: 'КОМСОМОЛЬСКАЯ',
        CODE: '1',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'ул.'
      },
      {
        ID: 3,
        STREET: 'БРУСНИЧНЫЙ',
        CODE: '4',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'пер.'
      },
      {
        ID: 4,
        STREET: 'ЭСТОНСКИХ ДОРОЖНИКОВ',
        CODE: '3',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'мкр.'
      },
      {
        ID: 5,
        STREET: 'КЕДРОВЫЙ',
        CODE: '5',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'туп.'
      },
      {
        ID: 6,
        STREET: 'ЗЕЛЕНЫЙ',
        CODE: '6',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'пер.'
      },
      {
        ID: 7,
        STREET: 'МАГИСТРАЛЬНАЯ',
        CODE: '7',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'ул.'
      },
      {
        ID: 8,
        STREET: 'НАБЕРЕЖНАЯ',
        CODE: '8',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'ул.'
      },
      {
        ID: 9,
        STREET: 'НЕФТЯНИКОВ',
        CODE: '9',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'ул.'
      },
      {
        ID: 10,
        STREET: 'СОГЛАСИЯ',
        CODE: '10',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'ул.'
      },
      {
        ID: 11,
        STREET: 'СОСНОВЫЙ',
        CODE: '11',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'пер.'
      },
      {
        ID: 12,
        STREET: 'ДРУЖБЫ НАРОДОВ',
        CODE: '12',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'ул.'
      },
      {
        ID: 13,
        STREET: 'НАЦИОНАЛЬНЫЙ',
        CODE: '13',
        TOWN_ID: 2,
        CREATEDATE: '2026-03-10',
        STREET_TYPE: 'п.'
      }
    ],

    PAS_RTOWN: [
      {
        ID: 2,
        NAME: 'ЛЯНТОР',
        CODE: '2',
        CREATEDATE: '2026-03-10',
        FULL_NAME: 'ЛЯНТОР'
      }
    ],

    METER_TYPES: [
      {
        ID: 144,
        NAME: 'Тип 1',
        LOW_QUALITY_GRP_TARIFF: 561
      },
      {
        ID: 234,
        NAME: 'нет',
        LOW_QUALITY_GRP_TARIFF: 556
      },
      {
        ID: 343,
        NAME: 'тепловычислитель',
        LOW_QUALITY_GRP_TARIFF: 598
      }
    ],

    RMETER_STATUS: [
      {
        ID: 0,
        NAME: 'Снят'
      },
      {
        ID: 1,
        NAME: 'Коммерческий учет'
      },
      {
        ID: 2,
        NAME: 'Технический учет'
      },
    ],

    BUILD_MAINT_ACTS: [
      {
        ID: 255,
        BUILDINGS_ID: 1,
        ACT_NO: '64',
        ACT_BDATE: '2026-08-01',
        ACT_EDATE: '2026-08-01',
        ACT_DATE: '2026-08-06',
        CREATEDATE: '2026-08-06'
      }
    ],

    ABONENTS_FILES: [],

    CLIENTS: [
      {
        ID: 1,
        NAME: 'ГУРОВА АЛЕНА ВАЛЕРИЕВНА',
        BIRTHDAY: '',
        PHONE: '88465274589',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'set@sdasd.com'
      },
      {
        ID: 2,
        NAME: 'ВАСИЛЬЕВ СИМОН НИКОЛАЕВИЧ',
        BIRTHDAY: '',
        PHONE: '79324455341',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'dasdkjdkd@email.ru'
      },
      {
        ID: 3,
        NAME: 'АЛЕКСЕЕВА НАТАЛИЯ ВИТАЛИЕВНА',
        BIRTHDAY: '',
        PHONE: '88004345487',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'dsad@mail.ru'
      },
      {
        ID: 4,
        NAME: 'ВЕБЕР ДМИТРИЙ ЮРЬЕВИЧ',
        BIRTHDAY: '',
        PHONE: '799623432',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'cvbcv@mail.com'
      },
      {
        ID: 5,
        NAME: 'ГАВРИЛОВА ЛЮДМИЛА НИКОЛАЕВНА',
        BIRTHDAY: '',
        PHONE: '7888812222',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'mail@sdsd.com'
      },
      {
        ID: 6,
        NAME: 'ГАЗИРОВКА ИРИНА ЮРЬЕВНА',
        BIRTHDAY: '',
        PHONE: '7888812222',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'mail@sdsd.com'
      },
      {
        ID: 7,
        NAME: 'ГОМЕР ВАЛЕНТИНА ПАВЛОВНА',
        BIRTHDAY: '',
        PHONE: '7846268542',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'qwer@zxccv.com'
      },
      {
        ID: 8,
        NAME: 'ФРОЛОВА СВЕТЛАНА НИКОЛАЕВНА',
        BIRTHDAY: '',
        PHONE: '793423133',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'wer@mail.com'
      },
      {
        ID: 9,
        NAME: 'МИХЕЕВА НАДЕЖДА НИКОЛАЕВНА',
        BIRTHDAY: '',
        PHONE: '8712345690',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'hjkasd@ggmail.com'
      },
      {
        ID: 10,
        NAME: 'ЧУЛУНИНА УЛЬЯНА СЕРГЕЕВНА',
        BIRTHDAY: '',
        PHONE: '789123123',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'tyripipip@gmail.com'
      },
      {
        ID: 11,
        NAME: 'ЖУК АМИР КОНСТАНТИНОВИЧ',
        BIRTHDAY: '',
        PHONE: '79813734',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'mumhn@gmail.com'
      },
      {
        ID: 12,
        NAME: 'КАМАЕВ МАРАТ МУНИРОВИЧ',
        BIRTHDAY: '',
        PHONE: '79994545454',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'dsads@cddccd.mail'
      },
      {
        ID: 13,
        NAME: 'ТУТОВА АЛЬБИНА ПАВЛОВНА',
        BIRTHDAY: '',
        PHONE: '733454645',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'mail@mail.mail'
      },
      {
        ID: 14,
        NAME: 'МУРТУЗАЛИЕВ ЗАУР МУРТУЗАЛИЕВИЧ',
        BIRTHDAY: '',
        PHONE: '89945456621',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'dfggf@mail.ru'
      },
      {
        ID: 15,
        NAME: 'ГАВРИЛОВА АЛЕНА ПАВЛОВНА',
        BIRTHDAY: '',
        PHONE: '7823423423',
        CREATEDATE: '2026-08-06',
        IMPORT: 1,
        MAIL: 'alenamail@mail.com'
      }
    ],

    VIOLATIONS: [],
    BOILER_STATUS: [
      {
        ID: 1,
        STATUS: 'В наличии',
        METER_ID: 14,
        CREATEDATE: '2026-08-06'
      }
    ]
  };

  /* ========================================================== */
  /* Служебная часть                                            */
  /* ========================================================== */

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadDb() {
    if (LOCAL_MOCK_PERSIST) {
      try {
        const raw = localStorage.getItem(LOCAL_DB_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.CONTROLLERS) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Не удалось прочитать LOCAL_MOCK_DB из localStorage:', e);
      }
    }

    return clone(LOCAL_DB_SEED);
  }
  const LOCAL_DB = loadDb();
  window.LOCAL_DB = LOCAL_DB;
  if (!LOCAL_DB.BOILER_STATUS) LOCAL_DB.BOILER_STATUS = [];

  function persistDb() {
    if (!LOCAL_MOCK_PERSIST) return;

    try {
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(LOCAL_DB));
    } catch (e) {
      console.warn('Не удалось сохранить LOCAL_MOCK_DB в localStorage:', e);
    }
  }

  window.resetLocalMockDb = function () {
    try {
      localStorage.removeItem(LOCAL_DB_KEY);
    } catch (e) {
      console.log('error: ', e);
    }
    window.location.reload();
  };

  function httpResponse(status, body) {
    return {
      __localResponse: true,
      status,
      body
    };
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const n = Number(value);
    return isNaN(n) ? null : n;
  }

  function formatDateOnly(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function nowDateTime() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function nextId(tableName) {
    const arr = LOCAL_DB[tableName] || [];
    return arr.reduce((max, row) => Math.max(max, toNumber(row.ID) || 0), 0) + 1;
  }

  function getAbonentByLs(ls) {
    return LOCAL_DB.ABONENTS.find(a => String(a.G_LICSCHET) === String(ls)) || null;
  }

  function getClientByLs(ls) {
    const abonent = getAbonentByLs(ls);
    if (!abonent) return null;
    return LOCAL_DB.CLIENTS.find(c => c.ID === abonent.CLIENT_ID) || null;
  }

  function getServiceByMeter(meter) {
    const meterType = LOCAL_DB.METER_TYPES.find(t => t.ID === meter.METER_TYPE);
    if (!meterType) return null;
    return LOCAL_DB.SERVICES.find(s => s.ID === meterType.LOW_QUALITY_GRP_TARIFF) || null;
  }

  function isValidMeter(meter) {
    if (toNumber(meter.STATUS) !== 1) {
      return false;
    }
    const service = getServiceByMeter(meter);
    if (!service) {
      return true;
    }
    return [537, 555, 597].includes(toNumber(service.GROUP_ID));
  }

  function getFirstControllerIdByLs(ls, preferredControllerId = null) {
    const meters = LOCAL_DB.METERS.filter(
      m => String(m.LS) === String(ls)
    );

    if (!meters.length) {
      return null;
    }

    const sorted = [...meters].sort((a, b) => {
      const aCtrl = toNumber(a.CONTROLER_ID);
      const bCtrl = toNumber(b.CONTROLER_ID);
      const aPreferred = preferredControllerId !== null && aCtrl === preferredControllerId ? 1 : 0;
      const bPreferred = preferredControllerId !== null && bCtrl === preferredControllerId ? 1 : 0;
      if (aPreferred !== bPreferred) {
        return bPreferred - aPreferred;
      }
      if (aCtrl === null && bCtrl === null) return 0;
      if (aCtrl === null) return 1;
      if (bCtrl === null) return -1;
      return bCtrl - aCtrl;
    });

    return toNumber(sorted[0].CONTROLER_ID);
  }

  function compareByControllerIdDesc(a, b) {
    const aCtrl = toNumber(a.controllerId);
    const bCtrl = toNumber(b.controllerId);
    if (aCtrl === null && bCtrl === null) return 0;
    if (aCtrl === null) return 1;
    if (bCtrl === null) return -1;
    return bCtrl - aCtrl;
  }

  function meterToListItem(meter) {
    const abonent = getAbonentByLs(meter.LS);
    const client = abonent
      ? LOCAL_DB.CLIENTS.find(c => c.ID === abonent.CLIENT_ID)
      : null;
    const service = getServiceByMeter(meter);
    return {
      found: true,
      id: meter.ID,
      meterNum: meter.METER_NUM,
      name: meter.NAME || '',
      seal: meter.SEAL || '',
      manfDate: meter.MANFDATE || null,
      mountDate: meter.MOUNT_DATE,
      verifyDate: meter.VERIFY_DATE,
      licschet: meter.LS,
      apparts: abonent ? (abonent.APPARTS || null) : null,
      groupName: service ? (service.GROUP_NAME || null) : null,
      clientName: client ? (client.NAME || null) : null
    };
  }

  function sortMetersByMountDateDesc(list) {
    return list.sort((a, b) => {
      return String(b.mountDate || '').localeCompare(String(a.mountDate || ''));
    });
  }

  /* ========================================================== */
  /* Локальные маршруты API                                     */
  /* ========================================================== */

  const routes = {
    '/auth': ({ body }) => {
      const password = String(body.userpswd || '').trim();
      const controller = LOCAL_DB.CONTROLLERS.find(
        c => String(c.CONTROLLER_PSWD) === password
      );
      if (!controller) {
        return httpResponse(401, { error: 'wrong password' });
      }
      controller.AUTHDATE = Date.now();
      if (!controller.TOKEN) {
        controller.TOKEN = `LOCAL_TOKEN_${controller.ID}`;
      }
      persistDb();
      const firstMeter = LOCAL_DB.METERS[0] || null;
      return {
        status: 'OK',
        token: controller.TOKEN,
        authDate: controller.AUTHDATE,
        meterNum: firstMeter ? firstMeter.METER_NUM : null,
        mountDate: firstMeter ? firstMeter.MOUNT_DATE : null,
        verifyDate: firstMeter ? firstMeter.VERIFY_DATE : null,
        controllerId: controller.ID
      };
    },

    '/controller-addresses': ({ body }) => {
      const controllerId = toNumber(body.controllerId);
      if (!controllerId) {
        return httpResponse(400, { error: 'controllerId required' });
      }
      const meters = LOCAL_DB.METERS.filter(
        m => toNumber(m.CONTROLER_ID) === controllerId
      );
      const rows = [];
      meters.forEach(meter => {
        const abonent = getAbonentByLs(meter.LS);
        if (!abonent) return;
        const client = LOCAL_DB.CLIENTS.find(c => c.ID === abonent.CLIENT_ID) || null;
        const building = LOCAL_DB.BUILDINGS.find(b => b.ID === abonent.BUILDINGS_ID);
        if (!building) return;
        const street = LOCAL_DB.RSTREETS.find(s => s.ID === building.STREET_ID);
        if (!street) return;
         let lastIndDate = null;
        if (Array.isArray(LOCAL_DB.METERS_IND)) {
          const inds = LOCAL_DB.METERS_IND.filter(
            ind => String(ind.METER_ID).trim() === String(meter.METER_NUM).trim() && ind.CREATEDATE
          );
          if (inds.length > 0) {
            let maxDate = null;
            inds.forEach(ind => {
              let d;
              const dateStr = String(ind.CREATEDATE).trim();
              if (dateStr.includes('.')) {
                const parts = dateStr.split('.');
                if (parts.length === 3) {
                  d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
              } else {
                d = new Date(dateStr);
              }
              if (d && !isNaN(d.getTime()) && (maxDate === null || d > maxDate)) {
                maxDate = d;
              }
            });
            if (maxDate) {
              const y = maxDate.getFullYear();
              const m = String(maxDate.getMonth() + 1).padStart(2, '0');
              const day = String(maxDate.getDate()).padStart(2, '0');
              lastIndDate = `${y}-${m}-${day}`;
            }
          }
        }
        const letterPart = abonent.LETTER ? ` ${abonent.LETTER}` : '';
        const appartsPart = abonent.APPARTS
          ? `кв. ${abonent.APPARTS}${letterPart}`
          : letterPart.trim();
        const namePart = client && client.NAME ? client.NAME : 'ФИО не указано';
        const phonePart = client && client.PHONE ? `, тел: ${client.PHONE}` : '';
        const streetName = `${street.STREET_TYPE || ''} ${street.STREET || ''}`.trim();
        const houseName = String(building.HOUSE || '').trim();
        rows.push({
          meterId: meter.ID,
          controllerId: toNumber(meter.CONTROLER_ID),
          verifyDate: meter.VERIFY_DATE,
          buildingsId: building.ID,
          streetId: street.ID,
          streetName,
          houseName,
          displayText: `${appartsPart}, ${namePart}${phonePart}`,
          lastIndDate: lastIndDate,
          _apparts: abonent.APPARTS || '',
          _letter: abonent.LETTER || ''
        });
      });
      rows.sort((a, b) => {
        const byController = compareByControllerIdDesc(a, b);
        if (byController !== 0) return byController;
        const byStreet = String(a.streetName || '').localeCompare(
          String(b.streetName || ''), 'ru', { numeric: true }
        );
        if (byStreet !== 0) return byStreet;
        const byHouse = String(a.houseName || '').localeCompare(
          String(b.houseName || ''), 'ru', { numeric: true }
        );
        if (byHouse !== 0) return byHouse;
        const byApparts = String(a._apparts ?? '').localeCompare(
          String(b._apparts ?? ''), 'ru', { numeric: true }
        );
        if (byApparts !== 0) return byApparts;
        return String(a._letter ?? '').localeCompare(
          String(b._letter ?? ''), 'ru'
        );
      });
      return rows.map(({ _apparts, _letter, ...rest }) => rest);
    },

    '/controller-offline-package': ({ body }) => {
      const controllerId = toNumber(body.controllerId);
      if (!controllerId) {
        return httpResponse(400, { error: 'controllerId required' });
      }
      const controllerMeters = LOCAL_DB.METERS.filter(
        m => toNumber(m.CONTROLER_ID) === controllerId
      );
      const metersWithLastInd = controllerMeters.map(meter => {
        let lastIndDate = null;
        if (Array.isArray(LOCAL_DB.METERS_IND)) {
          const inds = LOCAL_DB.METERS_IND.filter(
            ind => String(ind.METER_ID).trim() === String(meter.METER_NUM).trim() && ind.CREATEDATE
          );
          if (inds.length > 0) {
            let maxDate = null;
            inds.forEach(ind => {
              let d;
              const dateStr = String(ind.CREATEDATE).trim();
              if (dateStr.includes('.')) {
                const parts = dateStr.split('.');
                if (parts.length === 3) {
                  d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
              } else {
                d = new Date(dateStr);
              }
              if (d && !isNaN(d.getTime()) && (maxDate === null || d > maxDate)) {
                maxDate = d;
              }
            });
            if (maxDate) {
              const y = maxDate.getFullYear();
              const m = String(maxDate.getMonth() + 1).padStart(2, '0');
              const day = String(maxDate.getDate()).padStart(2, '0');
              lastIndDate = `${y}-${m}-${day}`;
            }
          }
        }
        return {
          ...meter,
          LAST_IND_DATE: lastIndDate
        };
      });

      return {
        controllerId: controllerId,
        savedAt: Date.now(),
        streets: LOCAL_DB.RSTREETS,
        buildings: LOCAL_DB.BUILDINGS,
        abonents: LOCAL_DB.ABONENTS,
        meters: metersWithLastInd, // <-- Теперь с LAST_IND_DATE
        clients: LOCAL_DB.CLIENTS,
        meterTypes: LOCAL_DB.METER_TYPES,
        services: LOCAL_DB.SERVICES
      };
    },

    '/controller-history': ({ body }) => {
      const controllerId = toNumber(body.controllerId);
      if (!controllerId)
      {
        return httpResponse(400, {error: 'controllerId required'});        
      }
      const history = [];
      LOCAL_DB.METERS_IND.forEach(ind => {
        if (ind.IS_DELETED) return;
        const meter = LOCAL_DB.METERS.find(m => String(m.METER_NUM) === String(ind.METER_ID));
        if (!meter || toNumber(meter.CONTROLER_ID) !== controllerId) return;
        const act = LOCAL_DB.BUILD_MAINT_ACTS.find(a => a.ID === ind.ACT_ID);
        if (!act) return;
        const abonent = LOCAL_DB.ABONENTS.find(a => String(a.G_LICSCHET) === String(meter.LS));
        const building = abonent ? LOCAL_DB.BUILDINGS.find(b => b.ID === abonent.BUILDINGS_ID) : null;
        const street = building ? LOCAL_DB.RSTREETS.find(s => s.ID === building.STREET_ID) : null;
        const meterType = LOCAL_DB.METER_TYPES.find(t => t.ID === meter.METER_TYPE)
        const service =   meterType ? LOCAL_DB.SERVICES.find(s => s.ID == meterType.LOW_QUALITY_GRP_TARIFF) : null;
        let addressStr = 'адрес не найден';
        if (street && building) {
          const streetName = `${street.STREET_TYPE || ''} ${street.STREET || ''}`.trim();
          const houseName = `${building.HOUSE || ''}${building.CORPS ? ` ${building.CORPS}` : ''}`.trim();
          const appartsName = abonent?.APPARTS ? `кв. ${abonent.APPARTS}${abonent.LETTER ? ` ${abonent.LETTER}` : ''}` : '';
          addressStr = `${streetName}, д. ${houseName}${appartsName ? ', ' + appartsName : ''}`;
        }
        history.push({
          actId: act.ID,
          actNo: act.ACT_NO,
          actDate: act.ACT_DATE,
          meterNum: meter.METER_NUM,
          verifyDate: meter.VERIFY_DATE,
          ph: ind.PH !== null && ind.PH !== undefined
            ? Number(ind.PH).toLocaleString('ru-RU', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
              })
            : null,
          serviceName: service ? service.SHORT_NAME : 'Не указана',
          address: addressStr
        });        
      });
      history.sort((a,b) => String(b.actDate).localeCompare(String(a.actDate)));
      return history;
    },

    '/controllers': () => {
      return LOCAL_DB.CONTROLLERS.map(c => ({
        ID: c.ID,
        FIO: c.FIO || 'Контролер'
      }));
    },

    '/all-addresses': () => {
      const rows = [];
      LOCAL_DB.METERS.forEach(meter => {
        const abonent = LOCAL_DB.ABONENTS.find(a => String(a.G_LICSCHET) === String(meter.LS));
        if (!abonent) return;
        const client = LOCAL_DB.CLIENTS.find(c => c.ID === abonent.CLIENT_ID) || null;
        const building = LOCAL_DB.BUILDINGS.find(b => b.ID === abonent.BUILDINGS_ID);
        if (!building) return;
        const street = LOCAL_DB.RSTREETS.find(s => s.ID === building.STREET_ID);
        if (!street) return;
        const letterPart = abonent.LETTER ? ` ${abonent.LETTER}` : '';
        const appartsPart = abonent.APPARTS ? `кв. ${abonent.APPARTS}${letterPart}` : letterPart.trim();
        const namePart = client && client.NAME ? client.NAME : 'ФИО не указано';
        const phonePart = client && client.PHONE ? `, тел: ${client.PHONE}` : '';
        const streetName = `${street.STREET_TYPE || ''} ${street.STREET || ''}`.trim();
        const houseName = String(building.HOUSE || '').trim();
        rows.push({
          meterId: meter.ID,
          controllerId: toNumber(meter.CONTROLER_ID),
          verifyDate: meter.VERIFY_DATE,
          buildingsId: building.ID,
          streetId: street.ID,
          streetName,
          houseName,
          displayText: `${appartsPart}, ${namePart}${phonePart}`
        });
      });
      rows.sort((a, b) => {
        const byController = (b.controllerId || 0) - (a.controllerId || 0);
        if (byController !== 0) return byController;
        const byStreet = String(a.streetName || '').localeCompare(String(b.streetName || ''), 'ru', { numeric: true });
        if (byStreet !== 0) return byStreet;
        const byHouse = String(a.houseName || '').localeCompare(String(b.houseName || ''), 'ru', { numeric: true });
        if (byHouse !== 0) return byHouse;
        return 0;
      });
      return rows;
    },

    '/update-verify-date': ({ body }) => {
      const meterId = toNumber(body.meterId);
      const meter = LOCAL_DB.METERS.find(m => m.ID === meterId);
      if (!meter) {
        return httpResponse(400, { error: 'meter not found' });
      }
      meter.VERIFY_DATE = body.verifyDate || null;
      persistDb();
      return {
        status: 'OK',
        message: 'Дата проверки обновлена'
      };
    },

    '/update-meter-controller': ({ body }) => {
      const meterId = toNumber(body.meterId);
      let controllerId = null;
      if (body.controllerId !== null && body.controllerId !== undefined && String(body.controllerId).trim() !== '' && String(body.controllerId).toLowerCase() !== 'null') {
        controllerId = toNumber(body.controllerId);
      }
      if (!meterId) {
        return httpResponse(400, { error: 'meterId required' });
      }    
      const meter = LOCAL_DB.METERS.find(m => m.ID === meterId);
      if (!meter) {
        return httpResponse(404, { error: 'meter not found' });
      }    
      meter.CONTROLER_ID = controllerId;
      persistDb(); 
      return httpResponse(200, {
        status: 'OK',
        message: 'Контролёр обновлён'
      });
    },

    '/add-representative': ({ body }) => {
      const name = String(body.name || '').trim();
      if (!name) {
        return httpResponse(400, { error: 'Missing Name' });
      }
      const newClient = {
        ID: nextId('CLIENTS'),
        NAME: name,
        BIRTHDAY: '',
        PHONE: body.phone && String(body.phone).trim() ? String(body.phone).trim() : null,
        CREATEDATE: nowDateTime(),
        IMPORT: 1,
        MAIL: body.mail && String(body.mail).trim() ? String(body.mail).trim() : null
      };

      LOCAL_DB.CLIENTS.push(newClient);
      persistDb();
      return {
        status: 'OK',
        message: 'Data saved',
        id: newClient.ID
      };
    },

    '/get-owner-data': ({ body }) => {
      const g_licschet = body.g_licschet;
      if (!g_licschet) {
        return httpResponse(400, { error: 'g_licschet required' });
      }
      const abonent = getAbonentByLs(g_licschet);
      if (!abonent) {
        return { found: false };
      }
      const client = LOCAL_DB.CLIENTS.find(c => c.ID === abonent.CLIENT_ID) || null;
      return {
        found: true,
        ownerName: client ? client.NAME : null,
        phone: client ? client.PHONE : null,
        mail: client ? client.MAIL : null,
        clientId: client ? client.ID : null
      };
    },

    '/update-owner-data': ({ body }) => {
      const clientId = toNumber(body.clientId);
      if (!clientId) {
        return {
          status: 'OK',
          message: 'Data updated (no client records)'
        };
      }

      const client = LOCAL_DB.CLIENTS.find(c => c.ID === clientId);
      if (!client) {
        return httpResponse(400, { error: 'client not found' });
      }
      client.NAME = body.ownerName || client.NAME;
      client.PHONE = body.phone || null;
      client.MAIL = body.mail || null;
      persistDb();
      return {
        status: 'OK',
        message: 'Data updated'
      };
    },

    '/update-token': ({ body }) => {
      const token = body.token;
      const controller = LOCAL_DB.CONTROLLERS.find(c => c.TOKEN === token);
      if (!controller) {
        return httpResponse(401, { error: 'Invalid token' });
      }
      controller.AUTHDATE = Date.now();
      persistDb();
      return {
        status: 'OK',
        token,
        authDate: controller.AUTHDATE
      };
    },

    '/generate-act': ({ body }) => {
      const serviceId = body ? toNumber(body.serviceId || body.service_id) : null;
      const now = new Date();
      const actBdate = new Date(now.getFullYear(), now.getMonth(), 1);
      const actEdate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const bdateStr = formatDateOnly(actBdate);
      const edateStr = formatDateOnly(actEdate);
      const actDateStr = nowDateTime();     
      const monthPrefix = bdateStr.slice(0, 7);
      const maxNo = LOCAL_DB.BUILD_MAINT_ACTS
        .filter(a => String(a.ACT_BDATE || '').startsWith(monthPrefix))
        .reduce((max, a) => Math.max(max, parseInt(a.ACT_NO, 10) || 0), 0);       
      const newActNo = String(maxNo + 1).padStart(5, '0');   
      const act = {
        ID: nextId('BUILD_MAINT_ACTS'),
        BUILDING_ID: null,
        ACT_NO: newActNo,
        ACT_BDATE: bdateStr,
        ACT_EDATE: edateStr,
        ACT_DATE: actDateStr,
        SERVICE_ID: serviceId || null,
        CREATEDATE: actDateStr
      };   
      LOCAL_DB.BUILD_MAINT_ACTS.push(act);
      persistDb();     
      return {
        actId: act.ID,
        actNo: act.ACT_NO,
        actDate: act.ACT_DATE,
        actBdate: act.ACT_BDATE,
        actEdate: act.ACT_EDATE
      };
    },

    '/update-act-service': ({ body }) => {
      const actId = toNumber(body.actId);
      const serviceId = toNumber(body.serviceId);
      const act = LOCAL_DB.BUILD_MAINT_ACTS.find(a => a.ID === actId);
      if (!act) {
        return httpResponse(400, { error: 'act not found' });
      }
      act.SERVICE_ID = serviceId || null;
      persistDb();
      return { status: 'OK', message: 'SERVICE_ID updated' };
    },

    '/update-act-building': ({ body }) => {
      const actId = toNumber(body.actId);
      const buildingId = toNumber(body.buildingId);
      const act = LOCAL_DB.BUILD_MAINT_ACTS.find(a => a.ID === actId);
      if (!act) {
        return httpResponse(400, { error: 'act not found' });
      }
      act.BUILDING_ID = buildingId;
      persistDb();
      return {
        status: 'OK',
        message: 'BUILDING_ID updated',
        actId,
        buildingId
      };
    },

    '/cities': () => {
      return LOCAL_DB.PAS_RTOWN.map(t => ({
        id: t.ID,
        name: t.NAME
      }));
    },

    '/streets': ({ query }) => {
      const townId = toNumber(query.townId);
      return LOCAL_DB.RSTREETS
        .filter(s => toNumber(s.TOWN_ID) === townId)
        .map(s => ({
          id: s.ID,
          name: `${s.STREET_TYPE || ''} ${s.STREET || ''}`.trim()
        }));
    },

    '/buildings': ({ query }) => {
      const streetId = toNumber(query.streetId);
      return LOCAL_DB.BUILDINGS
        .filter(b => toNumber(b.STREET_ID) === streetId)
        .map(b => {
          const corpsPart = b.CORPS ? ` ${b.CORPS}` : '';
          return {
            id: b.ID,
            house: `${b.HOUSE || ''}${corpsPart}`.trim()
          };
        });
    },

    '/apparts': ({ query }) => {
      const buildingId = toNumber(query.buildingId);
      const controllerId = toNumber(query.controllerId);
      const abonents = LOCAL_DB.ABONENTS.filter(
        a => toNumber(a.BUILDINGS_ID) === buildingId
      );
      const result = [];
      abonents.forEach(abonent => {
        const metersByLs = LOCAL_DB.METERS.filter(
          m => String(m.LS) === String(abonent.G_LICSCHET)
        );
        let include = false;
        if (metersByLs.length === 0) {
          include = true;
        } else {
          include = metersByLs.some(m => {
            return (
              toNumber(m.CONTROLER_ID) === controllerId &&
              isValidMeter(m)
            );
          });
        }
        if (!include) return;
        const letterPart = abonent.LETTER ? ` ${abonent.LETTER}` : '';
        const house =
          abonent.APPARTS === null ||
          abonent.APPARTS === undefined ||
          String(abonent.APPARTS).trim() === ''
            ? letterPart.trim()
            : `кв. ${abonent.APPARTS}${letterPart}`.trim();
        const abonentControllerId = getFirstControllerIdByLs(
          abonent.G_LICSCHET,
          controllerId
        );
        result.push({
          id: abonent.ID,
          house,
          g_licschet: abonent.G_LICSCHET,
          controllerId: abonentControllerId,
          _apparts: abonent.APPARTS || '',
          _letter: abonent.LETTER || ''
        });
      });
      result.sort((a, b) => {
        const byController = compareByControllerIdDesc(a, b);
        if (byController !== 0) return byController;
        const byApparts = String(a._apparts ?? '').localeCompare(
          String(b._apparts ?? ''),
          'ru',
          { numeric: true }
        );
        if (byApparts !== 0) return byApparts;
        return String(a._letter ?? '').localeCompare(
          String(b._letter ?? ''),
          'ru'
        );
      });
      return result.map(({ _apparts, _letter, ...rest }) => rest);
    },

    '/save-boiler-status': ({ body }) => {
      const status = String(body.status || '').trim();
      if (!status) {
        return httpResponse(400, { error: 'status required' });
      }
      const meterId = toNumber(body.meterId);
      if (!LOCAL_DB.BOILER_STATUS) LOCAL_DB.BOILER_STATUS = [];
      const record = {
        ID: nextId('BOILER_STATUS'),
        STATUS: status,
        METER_ID: meterId,
        CREATEDATE: nowDateTime()
      };
      LOCAL_DB.BOILER_STATUS.push(record);
      persistDb();
      return { status: 'OK', message: 'Boiler status saved', id: record.ID };
    },

    '/meter-by-licschet': ({ body }) => {
      const g_licschet = body.g_licschet;
      const meter = LOCAL_DB.METERS.find(
        m => String(m.LS) === String(g_licschet) && isValidMeter(m)
      );
      if (!meter) {
        return {
          found: false,
          meterNum: null,
          mountDate: null,
          verifyDate: null,
          groupName: null,
          clientName: null
        };
      }
      return meterToListItem(meter);
    },

    '/meters-by-licschet': ({ body }) => {
      const g_licschet = body.g_licschet;
      const meters = LOCAL_DB.METERS.filter(
        m => String(m.LS) === String(g_licschet) && isValidMeter(m)
      );
      return sortMetersByMountDateDesc(meters.map(m => meterToListItem(m)));
    },

    '/meter-by-building': ({ body }) => {
      const buildingId = toNumber(body.buildingId);
      const abonents = LOCAL_DB.ABONENTS.filter(a => {
        return (
          toNumber(a.BUILDINGS_ID) === buildingId &&
          (!a.APPARTS || String(a.APPARTS).trim() === '')
        );
      });
      for (const abonent of abonents) {
        const meter = LOCAL_DB.METERS.find(
          m => String(m.LS) === String(abonent.G_LICSCHET) && isValidMeter(m)
        );
        if (meter) {
          return meterToListItem(meter);
        }
      }
      return {
        found: false, 
        id: meter.ID,
        meterNum: null,
        name: null,
        seal: null,
        manfDate: null,
        mountDate: null,
        verifyDate: null,
        groupName: null,
        clientName: null
      };
    },

    '/meters-by-building': ({ body }) => {
      const buildingId = toNumber(body.buildingId);
      const abonents = LOCAL_DB.ABONENTS.filter(
        a => toNumber(a.BUILDINGS_ID) === buildingId
      );
      const result = [];
      abonents.forEach(abonent => {
        const meters = LOCAL_DB.METERS.filter(
          m => String(m.LS) === String(abonent.G_LICSCHET) && isValidMeter(m)
        );
        meters.forEach(meter => {
          result.push(meterToListItem(meter));
        });
      });
      return sortMetersByMountDateDesc(result);
    },

    '/PH': ({ body }) => {
      const phRaw = body.ph;
      const meterIdRaw = body.meter_id;
      if (phRaw === undefined || phRaw === null || !meterIdRaw) {
        return httpResponse(400, { error: 'ph и meter_id required' });
      }
      const meter = LOCAL_DB.METERS.find(
        m => String(m.METER_NUM) === String(meterIdRaw)
      );
      if (!meter) {
        return httpResponse(500, { error: 'no meter' });
      }
      const ph = parseFloat(String(phRaw).replace(',', '.'));
      if (isNaN(ph)) {
        return httpResponse(400, { error: 'invalid ph' });
      }
      const actId = toNumber(body.act_id || body.actId);
      const indication = {
        ID: nextId('METERS_IND'),
        METER_ID: meter.METER_NUM,
        ACT_ID: actId,
        PH: ph,
        CREATEDATE: nowDateTime(),
        IS_DELETED: 0
      };

      LOCAL_DB.METERS_IND.push(indication);
      persistDb();

      return {
        status: 'OK',
        message: 'Saved',
        action: 'INSERT',
        data: {
          ph,
          meter_id: meter.METER_NUM,
          createdate: indication.CREATEDATE
        }
      };
    },

    '/PH/last': ({ query }) => {
      const meterId = query.meter_id;
      if (!meterId) {
        return httpResponse(400, { error: 'meter_id required' });
      }
      const rows = LOCAL_DB.METERS_IND
        .filter(i => String(i.METER_ID) === String(meterId) && !i.IS_DELETED)
        .sort((a, b) => toNumber(b.ID) - toNumber(a.ID));
      if (!rows.length) {
        return {
          found: false,
          ph: null,
          date: null
        };
      }

      const last = rows[0];
      const phFormatted =
        last.PH !== null && last.PH !== undefined
          ? Number(last.PH).toLocaleString('ru-RU', {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3
            })
          : null;
      return {
        found: true,
        ph: phFormatted,
        phRaw: last.PH,
        date: last.CREATEDATE,
        id: last.ID
      };
    },

    '/save-violation': ({ body }) => {
      const meterNum = body.meterNum;
      if (!meterNum) {
        return httpResponse(400, { error: 'meternum required' });
      }
      let violations = [];
      try {
        violations = body.violations ? JSON.parse(body.violations) : [];
      } catch (e) {
        return httpResponse(400, { error: 'wrong format' });
      }
      if (!Array.isArray(violations) || violations.length === 0) {
        return httpResponse(400, { error: 'no violation' });
      }
      const meter = LOCAL_DB.METERS.find(
        m => String(m.METER_NUM) === String(meterNum)
      );
      if (!meter) {
        return httpResponse(404, { error: 'no meter' });
      }
      const licschet = body.licschet || meter.LS;
      const abonent = getAbonentByLs(licschet);
      const client = abonent
        ? LOCAL_DB.CLIENTS.find(c => c.ID === abonent.CLIENT_ID)
        : null;
      const createdate = nowDateTime();
      violations.forEach(v => {
        LOCAL_DB.VIOLATIONS.push({
          ID: nextId('VIOLATIONS'),
          NAME: v.name || '',
          DESCRIPTION: v.description || '',
          ABONENT_ID: abonent ? abonent.ID : null,
          METERS_ID: meter.ID,
          CREATEDATE: createdate
        });
      });
      persistDb();
      return {
        status: 'OK',
        message: 'Saved'
      };
    },

    '/get-meter-details': ({ body }) => {
      const meterId = toNumber(body.meterId);
      const meter = LOCAL_DB.METERS.find(m => m.ID === meterId);
      if (!meter) {
        return { found: false };
      }
      return {
        found: true,
        id: meter.ID,
        meterNum: meter.METER_NUM,
        name: meter.NAME,
        seal: meter.SEAL,
        manfDate: meter.MANFDATE,
        mountDate: meter.MOUNT_DATE,
        verifyDate: meter.VERIFY_DATE,
        licschet: meter.LS
      };
    },

    '/update-meter': ({ body }) => {
      const meterId = toNumber(body.meterId);
      const meter = LOCAL_DB.METERS.find(m => m.ID === meterId);
      if (!meter) {
        return httpResponse(400, { error: 'meter not found' });
      }
      meter.METER_NUM = body.meterNum || meter.METER_NUM;
      meter.NAME = body.name || null;
      meter.SEAL = body.seal || null;
      meter.MANFDATE = body.manfDate || null;
      meter.MOUNT_DATE = body.mountDate || meter.MOUNT_DATE;
      meter.VERIFY_DATE = body.verifyDate || null;
      persistDb();
      return {
        status: 'OK',
        message: 'Data updated'
      };
    },

  };

  /* ========================================================== */
  /* Перехват fetch                                             */
  /* ========================================================== */

  async function parseBody(init) {
    if (!init || !init.body) {
      return {};
    }
    if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
      const obj = {};
      for (const [key, value] of init.body.entries()) {
        const isFile =
          (typeof File !== 'undefined' && value instanceof File) ||
          (typeof Blob !== 'undefined' && value instanceof Blob);
        if (isFile) {
          continue;
        }
        if (obj[key] === undefined) {
          obj[key] = value;
        } else if (Array.isArray(obj[key])) {
          obj[key].push(value);
        } else {
          obj[key] = [obj[key], value];
        }
      }
      return obj;
    }
    if (typeof init.body === 'string') {
      try {
        return JSON.parse(init.body);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async function (input, init) {
    try {
      const url = typeof input === 'string' ? input : input.url;
      const parsedUrl = new URL(url, window.location.href);
      const path = parsedUrl.pathname;
      const route = routes[path];
      if (!route) {
        if (originalFetch) {
          return originalFetch(input, init);
        }
        return new Response(
          JSON.stringify({ error: `No local route: ${path}` }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      const body = await parseBody(init);
      const query = Object.fromEntries(parsedUrl.searchParams.entries());
      const result = await route({
        body,
        query,
        init,
        url: parsedUrl
      });
      if (result && result.__localResponse) {
        return new Response(JSON.stringify(result.body || {}), {
          status: result.status || 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(result ?? {}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
})();

/* ========================================================== */
/* LOCAL MOCK DB END                                          */
/* ========================================================== */

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////TEMP DB
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : (window.location.protocol.startsWith('http') ? window.location.origin : 'http://10.151.16.1:3000');

async function apiRequest(endpoint, data = {}, method = 'POST') { 
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'GET' ? JSON.stringify(data) : undefined
    });   
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(`Сервер вернул HTML вместо JSON (Статус: ${response.status}). URL: ${endpoint}`);
    }
    if (!response.ok) {
      const err = new Error(result.error || `Ошибка сервера: ${response.status}`);
      err.status = response.status;
      err.body = result;
      console.error(`API request failed (${endpoint}): status=${response.status}`, result);
      throw err;
    }
    return result;
  } catch (error) {
    if (error && error.status) {
      console.error(`API request failed (${endpoint}): status=${error.status}`, error.body || error.message);
    } else {
      console.error(`API request failed (${endpoint}):`, error);
    }
    throw error;
  }
}

function checkSession() {
  const path = window.location.pathname.toLowerCase();
  const href = window.location.href.toLowerCase();
  if (path.includes('index.html') || path.includes('oldtokenwindow.html') || path === '/' || path === '/frontend') {
    return true;
  }
  const authData = getAuthData();
  const isOffline = !navigator.onLine;
  if (!authData) {
    if (isOffline) {
      console.warn("Офлайн-режим, отсутствует подключение к сети.");
      return true;
    }
    setTimeout(() => window.location.href = 'index.html', 2000);
    return false;
  }
  const data = JSON.parse(authData);
  const now = Date.now();
  const EXPIRY_MS = 24000000;
  if (!isOffline && (now - data.authDate > EXPIRY_MS)) {
    console.warn("Сессия истекла");
    sessionStorage.setItem('lastAuthDate', authData.authDate);
    return false; 
  }
  return true;
}

function getAuthData() {
  let data = sessionStorage.getItem('authData');
  if (!data) {
    data = localStorage.getItem('authData');
  }
  return data ? JSON.parse(data) : null;
}

function clearSession() {
  sessionStorage.clear();
}

async function clearSessionAndLogout() {
  sessionStorage.clear();
  //localStorage.removeItem('authData');
  //localStorage.removeItem('offlineAuthData');
  //localStorage.removeItem('lastPassword');
  //localStorage.clear(); 
  try {
    if (typeof clearControllerPackage === 'function') {
      await clearControllerPackage();
    } else {
      const request = indexedDB.open('MeterOfflineStorage', 4);
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (db.objectStoreNames.contains('controllerPackages')) {
          const transaction = db.transaction(['controllerPackages'], 'readwrite');
          const store = transaction.objectStore('controllerPackages');
          store.clear();
        }
      };
    }
  } catch (e) {
    console.error('Ошибка очистки IndexedDB при выходе:', e);
  }  
  window.location.href = 'index.html';
}

async function syncPendingReadings() {
  if (!navigator.onLine) return;
  if (typeof getPendingReadings !== 'function') return;
  const pending = await getPendingReadings();
  if (pending.length === 0) return;
  console.log(`Найдено ${pending.length} записей`);
  for (const record of pending) {
    try {
      const formData = new FormData();
      if (record.isViolation) {
        formData.append('meterNum', record.meterNum);
        formData.append('licschet', record.licschet);
        formData.append('violations', record.violations);
        if (record.filesData && record.filesData.length > 0) {
          record.filesData.forEach(f => formData.append('files', base64ToBlob(f.fileBase64, f.fileType), f.fileName));
        } else if (record.fileBase64) {
          formData.append('files', base64ToBlob(record.fileBase64, record.fileType), record.fileName);
        }
        const response = await fetch(`${API_BASE}/save-violation`, { method: 'POST', body: formData });
        if (response.ok) {
          await deletePendingReading(record.id);
          console.log(`Нарушение ID ${record.id}`);
        }
      } else {
        formData.append('ph', record.ph);
        formData.append('meter_id', record.meter_id);
        formData.append('licschet', record.licschet);
        formData.append('abonent_name', record.abonent_name);
        formData.append('description', record.description);
        if (record.actId) {
          formData.append('act_id', record.actId);
        }
        if (record.filesData && record.filesData.length > 0) {
          record.filesData.forEach(f => formData.append('file', base64ToBlob(f.fileBase64, f.fileType), f.fileName));          
        } else if (record.fileBase64) { 
          formData.append('files', base64ToBlob(record.fileBase64, record.fileType), record.fileName);
        }
        const response = await fetch(`${API_BASE}/PH`, { method: 'POST', body: formData });
        if (response.ok) {
          await deletePendingReading(record.id);
          console.log(`Показания ID ${record.id}`);
        }
      }
    } catch (err) {
      console.error(`ошибка синхронизации ${record.id}:`, err);
    }
  }
}

async function getMetersByLicschet(g_licschet) {
  return await apiRequest('/meters-by-licschet', { g_licschet });
}

async function getMetersByBuilding(buildingId) {
  return await apiRequest('/meters-by-building', {buildingId});
}

async function getControllerAddresses(controllerId) {
  return await apiRequest('/controller-addresses', { controllerId });
}

async function updateVerifyDate(meterId, verifyDate) {
  return await apiRequest('/update-verify-date', { meterId, verifyDate });
}

function getSelectedMeter() {
  const data = sessionStorage.getItem('selectedMeter');
  return data ? JSON.parse(data) : null;
}

function saveSelectedMeter(meter) {
  sessionStorage.setItem('selectedMeter', JSON.stringify({
    meterNum: meter.meterNum,
    mountDate: meter.mountDate,
    verifyDate: meter.verifyDate,
    licschet: meter.licschet,
    id: meter.id
  }));
}

function clearSelectedMeter() {
  sessionStorage.removeItem('selectedMeter');
}

function getActiveMeter() {
  const data = sessionStorage.getItem('activeMeter');
  return data ? JSON.parse(data) : null;
}

function saveActiveMeter(meter) {
  sessionStorage.setItem('activeMeter', JSON.stringify({
    meterNum: meter.meterNum,
    mountDate: meter.mountDate,
    verifyDate: meter.verifyDate,
    licschet: meter.licschet,
    id: meter.id
  }));
}

function clearActiveMeter() {
  sessionStorage.removeItem('activeMeter');
}

function saveAllMeters(meters) {
  sessionStorage.setItem('allMeters', JSON.stringify(meters));
}

function getAllMeters() {
  const data = sessionStorage.getItem('allMeters');
  return data ? JSON.parse(data) : [];
}

function clearAllMeters() {
  sessionStorage.removeItem('allMeters');
}

function showAlert(message, type = 'info') {
  const existingModal = document.getElementById('custom-alert-modal');
  if (existingModal) existingModal.remove();
  const overlay = document.createElement('div');
  overlay.id = 'custom-alert-modal';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0, 0, 0, 0.6); z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.2s ease;
  `;
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #FFFFFF; border-radius: 8px; padding: 24px 20px;
    max-width: 340px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    border: 2px solid #45B0E1; text-align: center;
    animation: slideUp 0.25s ease;
  `;
  let iconColor = '#45B0E1';
  let icon = ' ';
  if (type === 'error') { iconColor = '#C62828'; icon = ' '; }
  if (type === 'success') { iconColor = '#28a745'; icon = ' '; }
  modal.innerHTML = `
    <div style="font-size: 40px; color: ${iconColor}; margin-bottom: 12px;">${icon}</div>
    <div style="font-size: 16px; color: #333333; line-height: 1.5; margin-bottom: 20px; word-break: break-word;">
      ${message.replace(/\n/g, '<br>')}
    </div>
    <button id="custom-alert-ok" style="
      width: 100%; padding: 12px 16px; font-size: 16px; font-weight: 600;
      color: #FFFFFF; background-color: #45B0E1; border: 2px solid #45B0E1;
      border-radius: 4px; cursor: pointer; touch-action: manipulation;
    ">OK</button>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const close = () => {
    overlay.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => overlay.remove(), 180);
  };
  const okBtn = modal.querySelector('#custom-alert-ok');
  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  setTimeout(() => okBtn.focus(), 50);
}

if (!document.getElementById('custom-alert-styles')) {
  const style = document.createElement('style');
  style.id = 'custom-alert-styles';
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `;
  document.head.appendChild(style);
}

window.alert = function(message) {
  showAlert(message, 'info');
};