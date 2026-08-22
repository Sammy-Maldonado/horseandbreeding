import { activeHorseFilter } from "./storehorse-compat";

/**
 * The recursive Prisma `select` that `POST /api/horse` uses to fetch a horse
 * together with its maternal line.
 *
 * It lived inline in the route handler until HOR-107. It is a pure function —
 * no Prisma client, no Nitro context — so moving it here makes its termination
 * directly testable without a database.
 */

/**
 * The depths a maternal line may legitimately have.
 *
 * `findFirstAncestor` starts its walk at 0 and stops it at 4, so every honest
 * answer it can give lives in `0..4`. Anything outside that range is not a
 * depth — it is a signal that no matching horse was found — and must never be
 * handed to `buildSelect`.
 */
export const MIN_PEDIGREE_LEVEL = 0;
export const MAX_PEDIGREE_LEVEL = 4;

/** True only for a depth `buildSelect` can build a real pedigree select for. */
export const isValidPedigreeLevel = (level: unknown): level is number =>
  typeof level === "number" &&
  Number.isInteger(level) &&
  level >= MIN_PEDIGREE_LEVEL &&
  level <= MAX_PEDIGREE_LEVEL;

export const buildSelect = (
  level: any,
  topLevel: any
): any => {
  // Absorbing base case. `!(level > 0)` rather than `level === 0`: an exact
  // equality test is skippable, and a level that skips it never comes back —
  // `level - 1` only ever moves away from it. Written this way the floor also
  // catches negative and non-numeric levels, so no input can descend past it.
  if (!(level > 0)) {
    if (topLevel == 0) {
      return {
        horse_id: true,
        name: true,
        birthyear: true,
        color: true,
        predicates: true,
        remarks: true,
        remarks_short: true,

        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true
              }
            } // This will include the related disciplinesvalues
          }
        },
        lineage_dam: true,
        breederid: true,
        breeders: true
      };
    }
    return {
      select: {
        horse_id: true,
        name: true,
        birthyear: true,
        color: true,
        predicates: true,
        remarks: true,
        remarks_short: true,

        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true
              }
            } // This will include the related disciplinesvalues
          }
        },
        sire: {
          select: {
            name: true
          }
        },
        breeders: {
          select: {
            id: true,
            breedername: true,
            addr1: true,
            tel: true,
            email: true,
            website: true,
            mapref: true,
            logo: true,
            farmname: true
          }
        },
        lineage_dam: {
          select: {
            horse_id: true,
            name: true,
            birthyear: true,
            color: true,
            predicates: true,
            remarks: true,
            remarks_short: true,

            has_disciplines: {
              select: {
                disciplines: {
                  select: {
                    value: true,
                    priority: true,
                    short: true
                  }
                } // This will include the related disciplinesvalues
              }
            },
            dam_id: true,
            sire: {
              select: {
                name: true
              }
            },
            breeders: {
              select: {
                id: true,
                breedername: true,
                addr1: true,
                tel: true,
                email: true,
                website: true,
                mapref: true,
                logo: true,
                farmname: true
              }
            },
            lineage_dam: {
              select: {
                horse_id: true,
                name: true,
                birthyear: true,
                color: true,
                predicates: true,
                remarks: true,
                remarks_short: true,

                has_disciplines: {
                  select: {
                    disciplines: {
                      select: {
                        value: true,
                        priority: true,
                        short: true
                      }
                    } // This will include the related disciplinesvalues
                  }
                },
                dam_id: true,
                sire: {
                  select: {
                    name: true
                  }
                },
                breeders: {
                  select: {
                    id: true,
                    breedername: true,
                    addr1: true,
                    tel: true,
                    email: true,
                    website: true,
                    mapref: true,
                    logo: true,
                    farmname: true
                  }
                },
                lineage_dam: {
                  select: {
                    horse_id: true,
                    name: true,
                    birthyear: true,
                    color: true,
                    predicates: true,
                    remarks: true,
                    remarks_short: true,

                    has_disciplines: {
                      select: {
                        disciplines: {
                          select: {
                            value: true,
                            priority: true,
                            short: true
                          }
                        } // This will include the related disciplinesvalues
                      }
                    },
                    dam_id: true,
                    sire: {
                      select: {
                        name: true
                      }
                    },
                    breeders: {
                      select: {
                        id: true,
                        breedername: true,
                        addr1: true,
                        tel: true,
                        email: true,
                        website: true,
                        mapref: true,
                        logo: true,
                        farmname: true
                      }
                    },
                    lineage_dam: {
                      select: {
                        horse_id: true,
                        name: true,
                        birthyear: true,
                        color: true,
                        predicates: true,
                        remarks: true,
                        remarks_short: true,

                        has_disciplines: {
                          select: {
                            disciplines: {
                              select: {
                                value: true,
                                priority: true,
                                short: true
                              }
                            } // This will include the related disciplinesvalues
                          }
                        },
                        dam_id: true,
                        sire: {
                          select: {
                            name: true
                          }
                        },
                        breeders: {
                          select: {
                            id: true,
                            breedername: true,
                            addr1: true,
                            tel: true,
                            email: true,
                            website: true,
                            mapref: true,
                            logo: true,
                            farmname: true
                          }
                        },
                        lineage_dam: {
                          select: {
                            horse_id: true,
                            name: true,
                            birthyear: true,
                            color: true,
                            predicates: true,
                            remarks: true,
                            remarks_short: true,

                            has_disciplines: {
                              select: {
                                disciplines: {
                                  select: {
                                    value: true,
                                    priority: true,
                                    short: true
                                  }
                                } // This will include the related disciplinesvalues
                              }
                            },
                            dam_id: true,
                            sire: {
                              select: {
                                name: true
                              }
                            },
                            breeders: {
                              select: {
                                id: true,
                                breedername: true,
                                addr1: true,
                                tel: true,
                                email: true,
                                website: true,
                                mapref: true,
                                logo: true,
                                farmname: true
                              }
                            }
                          },
                          where: {
                            ...activeHorseFilter()
                          },
                          orderBy: {
                            birthyear: "asc"
                          }
                        }
                      },
                      where: {
                        ...activeHorseFilter()
                      },
                      orderBy: {
                        birthyear: "asc"
                      }
                    }
                  },
                  where: {
                    ...activeHorseFilter()
                  },
                  orderBy: {
                    birthyear: "asc"
                  }
                }
              },
              where: {
                ...activeHorseFilter()
              },
              orderBy: {
                birthyear: "asc"
              }
            }
          },
          where: {
            ...activeHorseFilter()
          },
          orderBy: {
            birthyear: "asc"
          }
        },
        breederid: true
      }
    };
  }
  if (level === topLevel) {
    return {
      name: true,
      birthyear: true,
      color: true,
      predicates: true,
      remarks: true,
      remarks_short: true,

      has_disciplines: {
        select: {
          disciplines: {
            select: {
              value: true,
              priority: true,
              short: true
            }
          } // This will include the related disciplinesvalues
        }
      },
      horse_id: true,
      breederid: true,
      sire: {
        select: {
          name: true
        }
      },
      dam: buildSelect(level - 1, topLevel)
    };
  } else {
    return {
      select: {
        horse_id: true,
        name: true,
        birthyear: true,
        color: true,
        predicates: true,
        remarks: true,
        remarks_short: true,

        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true
              }
            } // This will include the related disciplinesvalues
          }
        },
        sire: {
          select: {
            name: true
          }
        },
        dam: buildSelect(level - 1, topLevel)
      }
    };
  }
};
